import { sql } from "@/lib/db";
import { verifyAdminToken } from "@/lib/auth";
import { encrypt, decrypt } from "@/lib/encryption";
import { AdminCreateEsimSchema, validateBody } from "@/lib/security/schemas";
import { getClientIp, checkStandardRateLimit } from "@/lib/security/rate-limit";
import { safeErrorResponse } from "@/lib/security/errors";
import { NextRequest, NextResponse } from "next/server";

// GET — Fetch all eSIMs (with decrypted credentials for admin view/edit)
export async function GET() {
  try {
    const admin = await verifyAdminToken();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const esims = await sql`
      SELECT 
        e.id, e.provider_name, e.provider_email_encrypted, e.provider_password_encrypted,
        e.activation_code, e.notes,
        e.status, e.created_at,
        c.username as assigned_to_username,
        c.display_name as assigned_to_name
      FROM esims e
      LEFT JOIN customers c ON e.assigned_customer_id = c.id
      ORDER BY e.status ASC, e.created_at DESC
    `;

    const decryptedEsims = esims.map((e) => {
      let email = "";
      let password = "";
      try {
        if (e.provider_email_encrypted) email = decrypt(e.provider_email_encrypted);
      } catch {}
      try {
        if (e.provider_password_encrypted) password = decrypt(e.provider_password_encrypted);
      } catch {}

      return {
        id: e.id,
        provider_name: e.provider_name,
        provider_email: email,
        provider_password: password,
        activation_code: e.activation_code,
        notes: e.notes,
        status: e.status,
        created_at: e.created_at,
        assigned_to_username: e.assigned_to_username,
        assigned_to_name: e.assigned_to_name,
      };
    });

    return NextResponse.json({ success: true, esims: decryptedEsims });
  } catch (error) {
    return safeErrorResponse(error, { clientMessage: "Failed to fetch eSIMs inventory." });
  }
}

// POST — Create a new standalone eSIM
export async function POST(request: NextRequest) {
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

    const rawBody = await request.json();

    // 2. Strict Schema Validation
    const validation = validateBody(AdminCreateEsimSchema, rawBody);
    if (!validation.success) {
      return validation.response;
    }
    const { provider_name, provider_email, provider_password, activation_code, notes } = validation.data;

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
    return safeErrorResponse(error, {
      clientMessage: "Failed to create eSIM profile.",
      context: { clientIp },
    });
  }
}

// PUT — Update carrier info, credentials, LPA code, and status of an existing eSIM
export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const { id, provider_name, provider_email, provider_password, activation_code, notes, status } = body;

    if (!id || typeof id !== "string" || !/^[a-zA-Z0-9-]+$/.test(id)) {
      return NextResponse.json({ error: "Valid eSIM ID is required." }, { status: 400 });
    }

    // Check existing eSIM
    const existing = await sql`
      SELECT id, provider_name, provider_email_encrypted, provider_password_encrypted, activation_code, notes, status
      FROM esims WHERE id = ${id}
    `;
    if (existing.length === 0) {
      return NextResponse.json({ error: "eSIM not found." }, { status: 404 });
    }

    const current = existing[0];
    const encryptedEmail = provider_email ? encrypt(provider_email) : current.provider_email_encrypted;
    const encryptedPassword = provider_password ? encrypt(provider_password) : current.provider_password_encrypted;

    await sql`
      UPDATE esims
      SET 
        provider_name = ${provider_name || current.provider_name},
        provider_email_encrypted = ${encryptedEmail},
        provider_password_encrypted = ${encryptedPassword},
        activation_code = ${activation_code !== undefined ? (activation_code || null) : current.activation_code},
        notes = ${notes !== undefined ? (notes || null) : current.notes},
        status = ${status || current.status}
      WHERE id = ${id}
    `;

    // Log the update
    await sql`
      INSERT INTO activity_log (admin_id, action, target_type, target_id, details)
      VALUES (${admin.id}, 'updated_esim', 'esim', ${id}, ${`Updated carrier info for "${provider_name || current.provider_name}"`})
    `;

    return NextResponse.json({ success: true, message: "eSIM updated successfully." });
  } catch (error) {
    return safeErrorResponse(error, {
      clientMessage: "Failed to update eSIM profile.",
      context: { clientIp },
    });
  }
}

// DELETE — Delete an existing eSIM
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id || !/^[a-zA-Z0-9-]+$/.test(id)) {
      return NextResponse.json({ error: "Valid eSIM ID is required." }, { status: 400 });
    }

    const existing = await sql`SELECT id, provider_name FROM esims WHERE id = ${id}`;
    if (existing.length === 0) {
      return NextResponse.json({ error: "eSIM not found." }, { status: 404 });
    }

    // Unlink any customer plans referencing this eSIM
    await sql`UPDATE customer_plans SET esim_id = NULL WHERE esim_id = ${id}`;

    // Delete eSIM
    await sql`DELETE FROM esims WHERE id = ${id}`;

    // Log the deletion
    await sql`
      INSERT INTO activity_log (admin_id, action, target_type, target_id, details)
      VALUES (${admin.id}, 'deleted_esim', 'esim', ${id}, ${`Deleted eSIM "${existing[0].provider_name}"`})
    `;

    return NextResponse.json({ success: true, message: "eSIM deleted successfully." });
  } catch (error) {
    return safeErrorResponse(error, {
      clientMessage: "Failed to delete eSIM profile.",
      context: { clientIp },
    });
  }
}