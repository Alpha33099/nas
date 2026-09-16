import { sql } from "@/lib/db";
import { createCustomerToken, setCustomerCookie } from "@/lib/auth";
import { resolveLocation, parseDeviceSummary } from "@/lib/geo";
import { CustomerLoginSchema, validateBody } from "@/lib/security/schemas";
import {
  getClientIp,
  checkAuthRateLimit,
  recordAuthFailure,
  recordAuthSuccess,
} from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/errors";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);

  try {
    const rawBody = await request.json();

    // 1. Strict Schema Validation (rejection of unexpected properties, format & length check)
    const validation = validateBody(CustomerLoginSchema, rawBody);
    if (!validation.success) {
      return validation.response;
    }
    const { username, password, gpsLat, gpsLon, gpsAccuracy } = validation.data;

    // 2. Dual IP & Account Rate Limiting with Exponential Backoff
    const rateCheck = checkAuthRateLimit(clientIp, username);
    if (!rateCheck.allowed) {
      return rateCheck.response;
    }

    // Look up the customer by username
    const customers = await sql`
      SELECT id, username, password_hash, first_login_at, first_login_source
      FROM customers
      WHERE username = ${username}
    `;

    if (customers.length === 0) {
      recordAuthFailure(clientIp, username);
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    const customer = customers[0];

    // Compare password with stored hash
    const passwordMatch = await bcrypt.compare(password, customer.password_hash);

    if (!passwordMatch) {
      recordAuthFailure(clientIp, username);
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    // Successful authentication: clear failure rate limit counters
    recordAuthSuccess(clientIp, username);

    // Process exact live GPS if available, otherwise fallback to IP
    const gpsData =
      typeof gpsLat === "number" && typeof gpsLon === "number" && gpsLat !== 0 && gpsLon !== 0
        ? { lat: gpsLat, lon: gpsLon, accuracy: typeof gpsAccuracy === "number" ? gpsAccuracy : undefined }
        : null;

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
    return safeErrorResponse(error, {
      clientMessage: "An error occurred during sign-in. Please try again.",
      context: { clientIp },
    });
  }
}