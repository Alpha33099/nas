import { sql } from "@/lib/db";
import { verifyAdminToken } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const admin = await verifyAdminToken();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const logs = await sql`
      SELECT 
        al.id, al.action, al.target_type, al.details, al.created_at,
        a.username as admin_username
      FROM activity_log al
      LEFT JOIN admins a ON al.admin_id = a.id
      ORDER BY al.created_at DESC
      LIMIT 100
    `;

    return NextResponse.json({ success: true, logs });
  } catch (error) {
    console.error("Activity log error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}