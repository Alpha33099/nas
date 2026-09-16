import { sql } from "@/lib/db";
import { verifyCustomerToken } from "@/lib/auth";
import { resolveLocation, parseDeviceSummary } from "@/lib/geo";
import { CustomerLocationSchema, validateBody } from "@/lib/security/schemas";
import { getClientIp, checkStandardRateLimit } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/errors";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);

  try {
    const customer = await verifyCustomerToken();
    if (!customer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Authenticated rate limit per customer
    const rateCheck = checkStandardRateLimit("authenticated", customer.id);
    if (!rateCheck.allowed) {
      return rateCheck.response;
    }

    const rawBody = await request.json();

    // 2. Strict Schema Validation (rejection of unexpected properties)
    const validation = validateBody(CustomerLocationSchema, rawBody);
    if (!validation.success) {
      return validation.response;
    }
    const { gpsLat, gpsLon, gpsAccuracy } = validation.data;

    const gpsData =
      gpsLat !== undefined && gpsLon !== undefined && gpsLat !== 0 && gpsLon !== 0
        ? { lat: gpsLat, lon: gpsLon, accuracy: gpsAccuracy }
        : null;

    const loc = await resolveLocation(request.headers, gpsData);
    const userAgent = request.headers.get("user-agent");
    const deviceSummary = parseDeviceSummary(userAgent);

    // Check if customer already has a first login anchor
    const existing = await sql`
      SELECT first_login_at, first_login_source FROM customers WHERE id = ${customer.id}
    `;

    const isFirstTime = !existing[0]?.first_login_at || existing[0]?.first_login_source !== "GPS";

    if (isFirstTime && loc.source === "GPS") {
      // Upgrade or set permanent origin anchor with true GPS coordinates
      await sql`
        UPDATE customers 
        SET 
          first_login_at = COALESCE(first_login_at, now()),
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
      // Update latest login session
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

    // Insert session audit log
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

    return NextResponse.json({
      success: true,
      source: loc.source,
      accuracy: loc.accuracy,
      locality: loc.locality,
      city: loc.city,
      country: loc.country,
      coords: loc.coords,
    });
  } catch (error) {
    return safeErrorResponse(error, {
      clientMessage: "Failed to update location.",
      context: { clientIp },
    });
  }
}
