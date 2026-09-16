import { sql } from "@/lib/db";
import { verifyAdminToken } from "@/lib/auth";
import { getClientIp, checkStandardRateLimit } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/errors";
import { z } from "zod";
import { validateBody } from "@/lib/security/schemas";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

const ResetPasswordInputSchema = z
  .object({
    password: z
      .string()
      .min(6, "Password must be at least 6 characters.")
      .max(128, "Password cannot exceed 128 characters."),
  })
  .strict();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const clientIp = getClientIp(request);

  try {
    const admin = await verifyAdminToken();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    // 1. Authenticated rate limit
    const rateCheck = checkStandardRateLimit("authenticated", admin.id);
    if (!rateCheck.allowed) {
      return rateCheck.response;
    }

    const { id } = await params;
    if (!id || !/^[a-zA-Z0-9-]+$/.test(id) || id.length > 64) {
      return NextResponse.json({ error: "Invalid customer ID." }, { status: 400 });
    }

    const rawBody = await request.json();

    // 2. Strict Schema Validation
    const validation = validateBody(ResetPasswordInputSchema, rawBody);
    if (!validation.success) {
      return validation.response;
    }
    const { password } = validation.data;

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
    return safeErrorResponse(error, {
      clientMessage: "Failed to reset password. Please try again.",
      context: { clientIp },
    });
  }
}