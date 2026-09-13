import { sql } from "@/lib/db";
import { verifyAdminToken } from "@/lib/auth";
import { encrypt } from "@/lib/encryption";
import { NextRequest, NextResponse } from "next/server";

// GET — Fetch all eSIMs
export async function GET() {
  try {
    const admin = await verifyAdminToken();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const esims = await sql`
      SELECT 
        e.id, e.provider_name, e.activation_code, e.notes,
        e.status, e.created_at,
        c.username as assigned_to_username,
        c.display_name as assigned_to_name
      FROM esims e
      LEFT JOIN customers c ON e.assigned_customer_id = c.id
      ORDER BY e.status ASC, e.created_at DESC
    `;

    return NextResponse.json({ success: true, esims });
  } catch (error) {
    console.error("Fetch eSIMs error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

// POST — Create a new standalone eSIM
export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdminToken();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const { provider_name, provider_email, provider_password, activation_code, notes } = body;

    if (!provider_name || !provider_email || !provider_password) {
      return NextResponse.json(
        { error: "Provider name, email, and password are required." },
        { status: 400 }
      );
    }

    // Encrypt credentials
    const encryptedEmail = encrypt(provider_email);
    const encryptedPassword = encrypt(provider_password);

    const newEsim = await sql`
      INSERT INTO esims (provider_name, provider_email_encrypted, provider_password_encrypted, activation_code, notes, status)
      VALUES (${provider_name}, ${encryptedEmail}, ${encryptedPassword}, ${activation_code || null}, ${notes || null}, 'available')
      RETURNING id
    `;

    // Log the action
    await sql`
      INSERT INTO activity_log (admin_id, action, target_type, target_id, details)
      VALUES (${admin.id}, 'created_esim', 'esim', ${newEsim[0].id}, ${`Created eSIM "${provider_name}"`})
    `;

    return NextResponse.json({ success: true, esim_id: newEsim[0].id });
  } catch (error) {
    console.error("Create eSIM error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}