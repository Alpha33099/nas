import { sql } from "@/lib/db";
import { createAdminToken, setAdminCookie } from "@/lib/auth";
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

    // Look up the admin by username
    const admins = await sql`
      SELECT id, username, password_hash
      FROM admins
      WHERE username = ${username}
    `;

    // If no admin found, return generic error
    if (admins.length === 0) {
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    const admin = admins[0];

    // Compare the provided password with the stored hash
    const passwordMatch = await bcrypt.compare(password, admin.password_hash);

    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

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
    console.error("Admin login error:", error);
    const msg = error instanceof Error ? error.message : "Something went wrong. Please try again.";
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}