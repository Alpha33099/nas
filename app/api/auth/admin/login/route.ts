import { sql } from "@/lib/db";
import { createAdminToken, setAdminCookie } from "@/lib/auth";
import { AdminLoginSchema, validateBody } from "@/lib/security/schemas";
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
    const validation = validateBody(AdminLoginSchema, rawBody);
    if (!validation.success) {
      return validation.response;
    }
    const { username, password } = validation.data;

    // 2. Dual IP & Account Rate Limiting with Exponential Backoff
    const rateCheck = checkAuthRateLimit(clientIp, username);
    if (!rateCheck.allowed) {
      return rateCheck.response;
    }

    // Look up the admin by username
    const admins = await sql`
      SELECT id, username, password_hash
      FROM admins
      WHERE username = ${username}
    `;

    // If no admin found, return generic error
    if (admins.length === 0) {
      recordAuthFailure(clientIp, username);
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    const admin = admins[0];

    // Compare the provided password with the stored hash
    const passwordMatch = await bcrypt.compare(password, admin.password_hash);

    if (!passwordMatch) {
      recordAuthFailure(clientIp, username);
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    // Successful authentication: clear failure rate limit counters
    recordAuthSuccess(clientIp, username);

    // Create JWT token and set cookie
    const token = createAdminToken({
      id: admin.id,
      username: admin.username,
    });

    await setAdminCookie(token);

    return NextResponse.json({
      success: true,
      message: "Login successful.",
    });
  } catch (error) {
    return safeErrorResponse(error, {
      clientMessage: "An error occurred during administrative sign-in. Please try again.",
      context: { clientIp },
    });
  }
}