import { sql } from "@/lib/db";
import { verifyAdminToken } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// GET — Fetch all plans
export async function GET() {
  try {
    const admin = await verifyAdminToken();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const plans = await sql`
      SELECT id, name, data_amount_gb, price, validity_days, description, instagram_message, created_at
      FROM plans_catalog
      ORDER BY data_amount_gb ASC
    `;

    return NextResponse.json({ success: true, plans });
  } catch (error) {
    console.error("Fetch plans error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

// POST — Create a new plan
export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdminToken();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const { name, data_amount_gb, price, validity_days, description, instagram_message } = body;

    // Validate required fields
    if (!name || !data_amount_gb || !price || !validity_days) {
      return NextResponse.json(
        { error: "Name, data amount (GB), price, and validity days are required." },
        { status: 400 }
      );
    }

    if (Number(data_amount_gb) <= 0 || Number(price) <= 0 || Number(validity_days) <= 0) {
      return NextResponse.json(
        { error: "Data amount, price, and validity days must be positive numbers." },
        { status: 400 }
      );
    }

    const newPlan = await sql`
      INSERT INTO plans_catalog (name, data_amount_gb, price, validity_days, description, instagram_message)
      VALUES (${name}, ${Number(data_amount_gb)}, ${Number(price)}, ${Number(validity_days)}, ${description || null}, ${instagram_message || null})
      RETURNING id, name, data_amount_gb, price, validity_days
    `;

    // Log the action
    await sql`
      INSERT INTO activity_log (admin_id, action, target_type, target_id, details)
      VALUES (${admin.id}, 'created_plan', 'plan', ${newPlan[0].id}, ${`Created plan "${name}"`})
    `;

    return NextResponse.json({ success: true, plan: newPlan[0] });
  } catch (error) {
    console.error("Create plan error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

// PUT — Update an existing plan
export async function PUT(request: NextRequest) {
  try {
    const admin = await verifyAdminToken();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, data_amount_gb, price, validity_days, description, instagram_message } = body;

    if (!id) {
      return NextResponse.json({ error: "Plan ID is required." }, { status: 400 });
    }

    if (!name || !data_amount_gb || !price || !validity_days) {
      return NextResponse.json(
        { error: "Name, data amount (GB), price, and validity days are required." },
        { status: 400 }
      );
    }

    // Check the plan exists
    const existing = await sql`SELECT id FROM plans_catalog WHERE id = ${id}`;
    if (existing.length === 0) {
      return NextResponse.json({ error: "Plan not found." }, { status: 404 });
    }

    await sql`
      UPDATE plans_catalog
      SET name = ${name},
          data_amount_gb = ${Number(data_amount_gb)},
          price = ${Number(price)},
          validity_days = ${Number(validity_days)},
          description = ${description || null},
          instagram_message = ${instagram_message || null}
      WHERE id = ${id}
    `;

    // Log the action
    await sql`
      INSERT INTO activity_log (admin_id, action, target_type, target_id, details)
      VALUES (${admin.id}, 'updated_plan', 'plan', ${id}, ${`Updated plan "${name}"`})
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update plan error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}