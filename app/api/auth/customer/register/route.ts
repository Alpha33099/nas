import { sql } from "@/lib/db";
import { createCustomerToken, setCustomerCookie } from "@/lib/auth";
import { CustomerRegisterSchema, validateBody } from "@/lib/security/schemas";
import {
  getClientIp,
  checkAuthRateLimit,
  recordAuthFailure,
  recordAuthSuccess,
} from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/errors";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);

  try {
    const rawBody = await request.json();

    // 1. Strict Schema Validation (rejection of unexpected properties, format & length check)
    const validation = validateBody(CustomerRegisterSchema, rawBody);
    if (!validation.success) {
      return validation.response;
    }
    const { username, password, displayName } = validation.data;

    // 2. Dual IP & Account Rate Limiting with Exponential Backoff
    const rateCheck = checkAuthRateLimit(clientIp, username);
    if (!rateCheck.allowed) {
      return rateCheck.response;
    }

    const cleanUsername = username.toLowerCase();
    const cleanDisplayName = displayName?.trim() || cleanUsername;

    // Check if username already exists
    const existing = await sql`
      SELECT id FROM customers WHERE LOWER(username) = ${cleanUsername}
    `;

    if (existing.length > 0) {
      recordAuthFailure(clientIp, username);
      return NextResponse.json(
        { error: "This username is already taken. Please choose another or sign in." },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    const customerId = crypto.randomUUID();

    // Create customer record
    await sql`
      INSERT INTO customers (
        id, username, password_hash, display_name, created_at
      ) VALUES (
        ${customerId}, ${cleanUsername}, ${passwordHash}, ${cleanDisplayName}, now()
      )
    `;

    // Registration succeeded: clear failure counter
    recordAuthSuccess(clientIp, username);

    // Log the user in with authentication session cookie
    const token = createCustomerToken({
      id: customerId,
      username: cleanUsername,
    });

    await setCustomerCookie(token);

    return NextResponse.json({
      success: true,
      customer: {
        id: customerId,
        username: cleanUsername,
        displayName: cleanDisplayName,
      },
    });
  } catch (error) {
    return safeErrorResponse(error, {
      clientMessage: "Registration failed. Please try again.",
      context: { clientIp },
    });
  }
}
