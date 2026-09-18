import { sql } from "@/lib/db";
import { verifyAdminToken } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const admin = await verifyAdminToken();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    // Fetch all customers with their active plans
    const rows = await sql`
      SELECT 
        c.username,
        c.display_name,
        c.last_login_at,
        c.created_at as customer_created,
        COALESCE(cp.plan_name, pc.name, 'Travel Data Plan') as plan_name,
        cp.total_gb,
        cp.used_gb,
        cp.start_date,
        cp.expiry_date,
        cp.status as plan_status,
        cp.last_usage_update_at
      FROM customers c
      LEFT JOIN customer_plans cp ON c.id = cp.customer_id
      LEFT JOIN plans_catalog pc ON cp.plan_catalog_id = pc.id
      ORDER BY c.username ASC, cp.start_date DESC
    `;

    // Build CSV
    const headers = [
      "Username", "Display Name", "Last Login", "Customer Created",
      "Plan Name", "Total GB", "Used GB", "Usage %",
      "Start Date", "Expiry Date", "Plan Status", "Last Usage Update"
    ];

    const csvRows = [headers.join(",")];

    for (const row of rows) {
      const usagePercent = Number(row.total_gb) > 0
        ? Math.round((Number(row.used_gb) / Number(row.total_gb)) * 100)
        : 0;

      const values = [
        row.username || "",
        `"${(row.display_name || "").replace(/"/g, '""')}"`,
        row.last_login_at ? new Date(row.last_login_at).toISOString().split("T")[0] : "",
        row.customer_created ? new Date(row.customer_created).toISOString().split("T")[0] : "",
        row.plan_name || "",
        row.total_gb ?? "",
        row.used_gb ?? "",
        row.plan_name ? `${usagePercent}%` : "",
        row.start_date ? new Date(row.start_date).toISOString().split("T")[0] : "",
        row.expiry_date ? new Date(row.expiry_date).toISOString().split("T")[0] : "",
        row.plan_status || "",
        row.last_usage_update_at ? new Date(row.last_usage_update_at).toISOString().split("T")[0] : "",
      ];

      csvRows.push(values.join(","));
    }

    const csv = csvRows.join("\n");
    const today = new Date().toISOString().split("T")[0];

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="simvaya-export-${today}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}