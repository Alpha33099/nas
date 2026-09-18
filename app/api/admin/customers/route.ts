import { sql } from "@/lib/db";
import { verifyAdminToken } from "@/lib/auth";
import { encrypt } from "@/lib/encryption";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";    


// GET — List all customers with plan data
export async function GET() {
  try {
    const admin = await verifyAdminToken();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const customers = await sql`
      SELECT 
        c.id,
        c.username,
        c.display_name,
        c.last_login_at,
        c.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', cp.id,
              'plan_name', pc.name,
              'total_gb', cp.total_gb,
              'used_gb', cp.used_gb,
              'expiry_date', cp.expiry_date,
              'status', cp.status
            )
          ) FILTER (WHERE cp.id IS NOT NULL),
          '[]'
        ) as plans
      FROM customers c
      LEFT JOIN customer_plans cp ON c.id = cp.customer_id
      LEFT JOIN plans_catalog pc ON cp.plan_catalog_id = pc.id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `;

    return NextResponse.json({ success: true, customers });
  } catch (error) {
    console.error("Fetch customers error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

// DELETE — Delete a customer
export async function DELETE(request: NextRequest) {
  try {
    const admin = await verifyAdminToken();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("id");

    if (!customerId) {
      return NextResponse.json({ error: "Customer ID is required." }, { status: 400 });
    }

    // Check customer exists
    const existing = await sql`SELECT username FROM customers WHERE id = ${customerId}`;
    if (existing.length === 0) {
      return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    }

    const customerUsername = existing[0].username;

    // Release any assigned eSIMs
    await sql`
      UPDATE esims SET status = 'available', assigned_customer_id = NULL
      WHERE assigned_customer_id = ${customerId}
    `;

    // Delete customer (customer_plans will cascade delete)
    await sql`DELETE FROM customers WHERE id = ${customerId}`;

    // Log the action
    await sql`
      INSERT INTO activity_log (admin_id, action, target_type, target_id, details)
      VALUES (${admin.id}, 'deleted_customer', 'customer', ${customerId}, ${`Deleted customer "${customerUsername}"`})
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete customer error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}



export async function POST(request: NextRequest) {
  try {
    // 1. Verify admin is logged in
    const admin = await verifyAdminToken();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const { username, password, display_name, esim, plan } = body;

    // 2. Validate required fields
    if (!username || !password || !display_name) {
      return NextResponse.json(
        { error: "Username, password, and display name are required." },
        { status: 400 }
      );
    }

    if (!plan?.plan_catalog_id || !plan?.start_date) {
      return NextResponse.json(
        { error: "Plan and start date are required." },
        { status: 400 }
      );
    }

    // 3. Check if username already exists
    const existingCustomer = await sql`
      SELECT id FROM customers WHERE username = ${username}
    `;
    if (existingCustomer.length > 0) {
      return NextResponse.json(
        { error: "A customer with this username already exists." },
        { status: 409 }
      );
    }

    // 4. Look up the plan catalog to get validity_days and data_amount_gb
    const planCatalog = await sql`
      SELECT id, data_amount_gb, validity_days 
      FROM plans_catalog 
      WHERE id = ${plan.plan_catalog_id}
    `;
    if (planCatalog.length === 0) {
      return NextResponse.json(
        { error: "Selected plan not found." },
        { status: 404 }
      );
    }

    const catalogPlan = planCatalog[0];

    // 5. Calculate expiry date
    const startDate = new Date(plan.start_date);
    const expiryDate = new Date(startDate);
    expiryDate.setDate(expiryDate.getDate() + catalogPlan.validity_days);
    const expiryDateStr = expiryDate.toISOString().split("T")[0]; // YYYY-MM-DD

    // 6. Hash the password
    const passwordHash = await bcrypt.hash(password, 12);

    // 7. Generate UUIDs upfront (needed for transaction)
    const customerId = crypto.randomUUID();
    const customerPlanId = crypto.randomUUID();

    // 8. Build transaction queries
    const queries: Parameters<typeof sql.transaction>[0] = [];

    // Create customer
    queries.push(
      sql`INSERT INTO customers (id, username, password_hash, display_name)
          VALUES (${customerId}, ${username}, ${passwordHash}, ${display_name})`
    );

    // Handle eSIM
    let esimId: string | null = null;

    if (esim?.type === "new") {
      // Validate new eSIM fields
      if (!esim.provider_name || !esim.provider_email || !esim.provider_password) {
        return NextResponse.json(
          { error: "eSIM provider name, email, and password are required." },
          { status: 400 }
        );
      }

      esimId = crypto.randomUUID();

      // Encrypt sensitive eSIM credentials
      const encryptedEmail = encrypt(esim.provider_email);
      const encryptedPassword = encrypt(esim.provider_password);

      queries.push(
        sql`INSERT INTO esims (id, provider_name, provider_email_encrypted, provider_password_encrypted, activation_code, notes, status, assigned_customer_id)
            VALUES (${esimId}, ${esim.provider_name}, ${encryptedEmail}, ${encryptedPassword}, ${esim.activation_code || null}, ${esim.notes || null}, 'assigned', ${customerId})`
      );
    } else if (esim?.type === "existing" && esim?.esim_id) {
      // Verify the eSIM exists and is available
      const existingEsim = await sql`
        SELECT id, status FROM esims WHERE id = ${esim.esim_id}
      `;
      if (existingEsim.length === 0) {
        return NextResponse.json(
          { error: "Selected eSIM not found." },
          { status: 404 }
        );
      }
      if (existingEsim[0].status !== "available") {
        return NextResponse.json(
          { error: "Selected eSIM is already assigned." },
          { status: 409 }
        );
      }

      esimId = esim.esim_id;

      queries.push(
        sql`UPDATE esims SET status = 'assigned', assigned_customer_id = ${customerId}
            WHERE id = ${esimId}`
      );
    }

    // Create customer plan
    queries.push(
      sql`INSERT INTO customer_plans (
        id, customer_id, plan_catalog_id, plan_name, validity_days,
        esim_id, total_gb, used_gb,
        manual_used_gb, manual_updated_at, daily_burn_rate,
        start_date, expiry_date, status
      )
      VALUES (
        ${customerPlanId}, ${customerId}, ${plan.plan_catalog_id}, ${catalogPlan.name}, ${catalogPlan.validity_days || 30},
        ${esimId}, ${catalogPlan.data_amount_gb}, 0,
        0, now(), 0,
        ${plan.start_date}, ${expiryDateStr}, 'active'
      )`
    );

    // 9. Execute transaction
    await sql.transaction(queries);

    // 10. Log the activity
    await sql`
      INSERT INTO activity_log (admin_id, action, target_type, target_id, details)
      VALUES (${admin.id}, 'created_customer', 'customer', ${customerId}, ${`Created customer "${username}" with plan`})
    `;

    return NextResponse.json({
      success: true,
      customer_id: customerId,
    });
  } catch (error) {
    console.error("Create customer error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}