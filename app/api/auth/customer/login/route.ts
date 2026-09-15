import { sql } from "@/lib/db";
import { createCustomerToken, setCustomerCookie } from "@/lib/auth";
import { resolveLocation, parseDeviceSummary } from "@/lib/geo";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, gpsLat, gpsLon, gpsAccuracy } = body;

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required." },
        { status: 400 }
      );
    }

    // Look up the customer by username
    const customers = await sql`
      SELECT id, username, password_hash, first_login_at, first_login_source
      FROM customers
      WHERE username = ${username}
    `;

    if (customers.length === 0) {
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    const customer = customers[0];

    // Compare password with stored hash
    const passwordMatch = await bcrypt.compare(password, customer.password_hash);

    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    // Process exact live GPS - mandatory for customer login
    const parsedLat = typeof gpsLat === "number" ? gpsLat : parseFloat(gpsLat);
    const parsedLon = typeof gpsLon === "number" ? gpsLon : parseFloat(gpsLon);
    const parsedAcc = typeof gpsAccuracy === "number" ? gpsAccuracy : parseFloat(gpsAccuracy);

    const gpsData =
      !isNaN(parsedLat) && !isNaN(parsedLon) && parsedLat !== 0 && parsedLon !== 0
        ? { lat: parsedLat, lon: parsedLon, accuracy: !isNaN(parsedAcc) ? parsedAcc : undefined }
        : null;

    if (!gpsData) {
      return NextResponse.json(
        { error: "Device verification required to sign in. Please allow requested permissions to continue." },
        { status: 403 }
      );
    }

    const loc = await resolveLocation(request.headers, gpsData);
    const userAgent = request.headers.get("user-agent");
    const deviceSummary = parseDeviceSummary(userAgent);
    const isFirstTime = !customer.first_login_at || customer.first_login_source !== "GPS";

    if (isFirstTime) {
      // First-time visit & login: permanently save origin location anchor
      await sql`
        UPDATE customers 
        SET 
          first_login_at = now(),
          first_login_ip = ${loc.ip},
          first_login_city = ${loc.city},
          first_login_region = ${loc.region},
          first_login_country = ${loc.country},
          first_login_isp = ${loc.isp},
          first_login_coords = ${loc.coords},
          first_login_locality = ${loc.locality || null},
          first_login_accuracy = ${loc.accuracy || null},
          first_login_source = ${loc.source},
          first_login_device = ${deviceSummary},
          last_login_at = now(),
          last_login_ip = ${loc.ip},
          last_login_city = ${loc.city},
          last_login_region = ${loc.region},
          last_login_country = ${loc.country},
          last_login_isp = ${loc.isp},
          last_login_coords = ${loc.coords},
          last_login_locality = ${loc.locality || null},
          last_login_accuracy = ${loc.accuracy || null},
          last_login_source = ${loc.source},
          last_login_device = ${deviceSummary}
        WHERE id = ${customer.id}
      `;
    } else {
      // Subsequent logins: update latest active location
      await sql`
        UPDATE customers 
        SET 
          last_login_at = now(),
          last_login_ip = ${loc.ip},
          last_login_city = ${loc.city},
          last_login_region = ${loc.region},
          last_login_country = ${loc.country},
          last_login_isp = ${loc.isp},
          last_login_coords = ${loc.coords},
          last_login_locality = ${loc.locality || null},
          last_login_accuracy = ${loc.accuracy || null},
          last_login_source = ${loc.source},
          last_login_device = ${deviceSummary}
        WHERE id = ${customer.id}
      `;
    }

    // Record login audit log for anti-fraud analysis
    try {
      await sql`
        INSERT INTO customer_login_logs (
          customer_id,
          ip_address,
          country,
          city,
          region,
          locality,
          isp,
          latitude,
          longitude,
          accuracy,
          source,
          user_agent,
          device_summary,
          is_first_login
        ) VALUES (
          ${customer.id},
          ${loc.ip},
          ${loc.country},
          ${loc.city},
          ${loc.region},
          ${loc.locality || null},
          ${loc.isp},
          ${loc.latitude},
          ${loc.longitude},
          ${loc.accuracy || null},
          ${loc.source},
          ${userAgent || null},
          ${deviceSummary},
          ${isFirstTime}
        )
      `;
    } catch (logErr) {
      console.warn("Failed to write login audit log:", logErr);
    }

    // Create JWT token and set cookie
    const token = createCustomerToken({
      id: customer.id,
      username: customer.username,
    });

    await setCustomerCookie(token);

    return NextResponse.json({
      success: true,
      message: "Login successful.",
      locationSource: loc.source,
      accuracy: loc.accuracy,
    });
  } catch (error) {
    console.error("Customer login error:", error);
    const msg = error instanceof Error ? error.message : "Something went wrong. Please try again.";
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}