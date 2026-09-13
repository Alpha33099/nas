import { sql } from "@/lib/db";
import { verifyAdminToken } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
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
    const { password } = body;

    if (!password) {
      return NextResponse.json({ error: "Password is required." }, { status: 400 });
    }

    // Verify customer exists
    const customer = await sql`SELECT id, username FROM customers WHERE id = ${id}`;
    if (customer.length === 0) {
      return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    }

    // Hash and update
    const passwordHash = await bcrypt.hash(password, 12);
    await sql`UPDATE customers SET password_hash = ${passwordHash} WHERE id = ${id}`;

    // Log the action (never log the password!)
    await sql`
      INSERT INTO activity_log (admin_id, action, target_type, target_id, details)
      VALUES (${admin.id}, 'reset_password', 'customer', ${id}, ${`Reset password for "${customer[0].username}"`})
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}