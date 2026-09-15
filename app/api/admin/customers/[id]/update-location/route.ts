import { sql } from "@/lib/db";
import { verifyAdminToken } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdminToken();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { city, country, region, locality, coords } = body;

    if (!city || !country) {
      return NextResponse.json({ error: "City and Country are required." }, { status: 400 });
    }

    // Verify customer exists
    const customer = await sql`
      SELECT id, username, first_login_city FROM customers WHERE id = ${id}
    `;
    if (customer.length === 0) {
      return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    }

    // Update customer's location to the admin's chosen place
    await sql`
      UPDATE customers
      SET 
        last_login_city = ${city},
        last_login_country = ${country},
        last_login_region = ${region || null},
        last_login_locality = ${locality || null},
        last_login_coords = ${coords || null},
        last_login_source = 'Admin Custom Override',
        last_login_at = COALESCE(last_login_at, now()),
        first_login_city = COALESCE(first_login_city, ${city}),
        first_login_country = COALESCE(first_login_country, ${country}),
        first_login_region = COALESCE(first_login_region, ${region || null}),
        first_login_locality = COALESCE(first_login_locality, ${locality || null}),
        first_login_coords = COALESCE(first_login_coords, ${coords || null}),
        first_login_source = COALESCE(first_login_source, 'Admin Custom Override'),
        first_login_at = COALESCE(first_login_at, now())
      WHERE id = ${id}
    `;

    // Also insert an audit log record
    try {
      const lat = coords ? parseFloat(coords.split(",")[0]) : null;
      const lon = coords ? parseFloat(coords.split(",")[1]) : null;
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
          source,
          device_summary,
          is_first_login
        ) VALUES (
          ${id},
          'Admin Override',
          ${country},
          ${city},
          ${region || null},
          ${locality || null},
          'Admin Designated Carrier',
          ${lat},
          ${lon},
          'Admin Custom Override',
          'Admin Panel Designated Location',
          false
        )
      `;
    } catch {}

    // Log admin activity
    await sql`
      INSERT INTO activity_log (admin_id, action, target_type, target_id, details)
      VALUES (
        ${admin.id},
        'updated_customer_location',
        'customer',
        ${id},
        ${'Designated location to ' + (locality ? locality + ', ' : '') + city + ', ' + country}
      )
    `;

    return NextResponse.json({
      success: true,
      message: "Customer location updated successfully.",
      city,
      country,
      coords,
    });
  } catch (error) {
    console.error("Update customer location error:", error);
    return NextResponse.json({ error: "Failed to update location." }, { status: 500 });
  }
}
