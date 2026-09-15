import { sql } from "@/lib/db";
import { createCustomerToken, setCustomerCookie } from "@/lib/auth";
import { resolveLocation, parseDeviceSummary } from "@/lib/geo";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required." },
        { status: 400 }
      );
    }

    // Look up the customer by username
    const customers = await sql`
      SELECT id, username, password_hash, first_login_at
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

    // Capture exact visitor geolocation & device
    const loc = await resolveLocation(request.headers);
    const userAgent = request.headers.get("user-agent");
    const deviceSummary = parseDeviceSummary(userAgent);
    const isFirstTime = !customer.first_login_at;

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
          first_login_device = ${deviceSummary},
          last_login_at = now(),
          last_login_ip = ${loc.ip},
          last_login_city = ${loc.city},
          last_login_region = ${loc.region},
          last_login_country = ${loc.country},
          last_login_isp = ${loc.isp},
          last_login_coords = ${loc.coords},
          last_login_device = ${deviceSummary}
        WHERE id = ${customer.id}
      `;
    } else {
      // Subsequent logins: update latest location
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
          isp,
          latitude,
          longitude,
          user_agent,
          device_summary,
          is_first_login
        ) VALUES (
          ${customer.id},
          ${loc.ip},
          ${loc.country},
          ${loc.city},
          ${loc.region},
          ${loc.isp},
          ${loc.latitude},
          ${loc.longitude},
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