import { sql } from "@/lib/db";
import { createCustomerToken, setCustomerCookie } from "@/lib/auth";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, displayName } = body;

    // Validate inputs
    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required." },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, "");
    if (cleanUsername.length < 3) {
      return NextResponse.json(
        { error: "Username must be at least 3 characters (letters, numbers, underscores)." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const cleanDisplayName = displayName?.trim() || cleanUsername;

    // Check if username already exists
    const existing = await sql`
      SELECT id FROM customers WHERE LOWER(username) = ${cleanUsername}
    `;

    if (existing.length > 0) {
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
    console.error("Customer registration error:", error);
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
