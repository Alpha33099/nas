import { sql } from "@/lib/db";
import { createCustomerToken, setCustomerCookie } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required." },
        { status: 400 }
      );
    }

    // Look up the customer by username
    const customers = await sql`
      SELECT id, username, password_hash
      FROM customers
      WHERE username = ${username}
    `;

    if (customers.length === 0) {
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    const customer = customers[0];

    // Compare password with stored hash
    const passwordMatch = await bcrypt.compare(password, customer.password_hash);

    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    // Update last_login_at
    await sql`
      UPDATE customers SET last_login_at = now() WHERE id = ${customer.id}
    `;

    // Create JWT token and set cookie
    const token = createCustomerToken({
      id: customer.id,
      username: customer.username,
    });

    await setCustomerCookie(token);

    return NextResponse.json({
      success: true,
      message: "Login successful.",
    });
  } catch (error) {
    console.error("Customer login error:", error);
    const msg = error instanceof Error ? error.message : "Something went wrong. Please try again.";
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}