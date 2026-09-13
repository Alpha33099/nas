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
      SELECT 
        id, 
        name, 
        data_amount_gb, 
        price, 
        validity_days, 
        description, 
        instagram_message, 
        is_highlighted, 
        is_on_sale, 
        sale_price, 
        badge_text, 
        is_active,
        created_at
      FROM plans_catalog
      WHERE is_active IS NOT FALSE
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
    const {
      name,
      data_amount_gb,
      price,
      validity_days,
      description,
      instagram_message,
      is_highlighted = false,
      is_on_sale = false,
      sale_price = null,
      badge_text = null,
    } = body;

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

    const parsedSalePrice = is_on_sale && sale_price ? Number(sale_price) : null;

    const newPlan = await sql`
      INSERT INTO plans_catalog (
        name, 
        data_amount_gb, 
        price, 
        validity_days, 
        description, 
        instagram_message,
        is_highlighted,
        is_on_sale,
        sale_price,
        badge_text,
        is_active
      )
      VALUES (
        ${name}, 
        ${Number(data_amount_gb)}, 
        ${Number(price)}, 
        ${Number(validity_days)}, 
        ${description || null}, 
        ${instagram_message || null},
        ${Boolean(is_highlighted)},
        ${Boolean(is_on_sale)},
        ${parsedSalePrice},
        ${badge_text || null},
        true
      )
      RETURNING id, name, data_amount_gb, price, validity_days, is_highlighted, is_on_sale, sale_price, badge_text
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
    const {
      id,
      name,
      data_amount_gb,
      price,
      validity_days,
      description,
      instagram_message,
      is_highlighted = false,
      is_on_sale = false,
      sale_price = null,
      badge_text = null,
    } = body;

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

    const parsedSalePrice = is_on_sale && sale_price ? Number(sale_price) : null;

    await sql`
      UPDATE plans_catalog
      SET name = ${name},
          data_amount_gb = ${Number(data_amount_gb)},
          price = ${Number(price)},
          validity_days = ${Number(validity_days)},
          description = ${description || null},
          instagram_message = ${instagram_message || null},
          is_highlighted = ${Boolean(is_highlighted)},
          is_on_sale = ${Boolean(is_on_sale)},
          sale_price = ${parsedSalePrice},
          badge_text = ${badge_text || null}
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

// DELETE — Delete or archive a plan
export async function DELETE(request: NextRequest) {
  try {
    const admin = await verifyAdminToken();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    let id = searchParams.get("id");

    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id;
    }

    if (!id) {
      return NextResponse.json({ error: "Plan ID is required." }, { status: 400 });
    }

    // Check if plan exists
    const existing = await sql`SELECT id, name FROM plans_catalog WHERE id = ${id}`;
    if (existing.length === 0) {
      return NextResponse.json({ error: "Plan not found." }, { status: 404 });
    }

    const planName = existing[0].name;

    // Check if plan is referenced by active or historical customer subscriptions
    const usageCheck = await sql`SELECT COUNT(*) as count FROM customer_plans WHERE plan_catalog_id = ${id}`;
    const inUse = Number(usageCheck[0].count);

    if (inUse > 0) {
      // Soft-delete to preserve subscriber history and FK integrity
      await sql`UPDATE plans_catalog SET is_active = false WHERE id = ${id}`;
      
      await sql`
        INSERT INTO activity_log (admin_id, action, target_type, target_id, details)
        VALUES (${admin.id}, 'archived_plan', 'plan', ${id}, ${`Archived plan "${planName}" (retained for ${inUse} customer plan records)`})
      `;

      return NextResponse.json({
        success: true,
        message: `Plan "${planName}" was removed from the catalog.`,
      });
    }

    // If completely unused, delete permanently
    await sql`DELETE FROM plans_catalog WHERE id = ${id}`;

    await sql`
      INSERT INTO activity_log (admin_id, action, target_type, target_id, details)
      VALUES (${admin.id}, 'deleted_plan', 'plan', ${id}, ${`Permanently deleted plan "${planName}"`})
    `;

    return NextResponse.json({
      success: true,
      message: `Plan "${planName}" deleted successfully.`,
    });
  } catch (error) {
    console.error("Delete plan error:", error);
    return NextResponse.json({ error: "Something went wrong deleting the plan." }, { status: 500 });
  }
}