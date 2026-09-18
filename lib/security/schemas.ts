import { z } from "zod";
import { NextResponse } from "next/server";

// ── Validation Helper ──────────────────────────────────────────────────────────

/**
 * Validates input against a strict Zod schema.
 * If validation fails, returns a 400 Bad Request response with the exact field violations
 * and stops execution — rejecting anything that doesn't match instead of just escaping.
 */
export function validateBody<T>(
  schema: z.ZodType<T>,
  data: unknown
): { success: true; data: T } | { success: false; response: NextResponse } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue.path.join(".") || "body";
    const errorMessage = `${path}: ${issue.message}`;

    return {
      success: false,
      response: NextResponse.json(
        {
          error: `Invalid input: ${errorMessage}`,
          code: "VALIDATION_FAILED",
          details: result.error.issues.map((i) => ({
            field: i.path.join(".") || "root",
            message: i.message,
            code: i.code,
          })),
        },
        { status: 400 }
      ),
    };
  }

  return { success: true, data: result.data };
}

// ── Authentication Schemas ───────────────────────────────────────────────────

export const CustomerLoginSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, "Username must be at least 3 characters.")
      .max(32, "Username cannot exceed 32 characters.")
      .regex(/^[a-zA-Z0-9_-]+$/, "Username may only contain letters, numbers, underscores, and hyphens."),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters.")
      .max(128, "Password cannot exceed 128 characters."),
    gpsLat: z
      .union([z.number(), z.string()])
      .optional()
      .transform((val) => (val === undefined || val === null || val === "" ? undefined : Number(val)))
      .pipe(z.number().min(-90).max(90).optional()),
    gpsLon: z
      .union([z.number(), z.string()])
      .optional()
      .transform((val) => (val === undefined || val === null || val === "" ? undefined : Number(val)))
      .pipe(z.number().min(-180).max(180).optional()),
    gpsAccuracy: z
      .union([z.number(), z.string()])
      .optional()
      .transform((val) => (val === undefined || val === null || val === "" ? undefined : Number(val)))
      .pipe(z.number().min(0).max(1000000).optional()),
  })
  .strict();

export const AdminLoginSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, "Username must be at least 3 characters.")
      .max(32, "Username cannot exceed 32 characters.")
      .regex(/^[a-zA-Z0-9_-]+$/, "Username may only contain letters, numbers, underscores, and hyphens."),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters.")
      .max(128, "Password cannot exceed 128 characters."),
  })
  .strict();

export const CustomerRegisterSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, "Username must be at least 3 characters.")
      .max(32, "Username cannot exceed 32 characters.")
      .regex(/^[a-zA-Z0-9_-]+$/, "Username may only contain letters, numbers, underscores, and hyphens."),
    displayName: z
      .string()
      .trim()
      .min(1, "Display name cannot be empty.")
      .max(64, "Display name cannot exceed 64 characters.")
      .optional(),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters.")
      .max(128, "Password cannot exceed 128 characters."),
  })
  .strict();

// ── Crypto Checkout Schemas ──────────────────────────────────────────────────

export const CryptoCreateSessionSchema = z
  .object({
    planId: z
      .string()
      .trim()
      .min(1, "Plan ID cannot be empty.")
      .max(64, "Plan ID cannot exceed 64 characters.")
      .regex(/^[a-zA-Z0-9-]+$/, "Invalid Plan ID format."),
  })
  .strict();

export const CryptoCheckSessionSchema = z
  .object({
    sessionId: z
      .string()
      .trim()
      .min(1, "Session ID cannot be empty.")
      .max(128, "Session ID is too long.")
      .regex(/^[a-zA-Z0-9-]+$/, "Invalid Session ID format."),
  })
  .strict();

// ── Customer Action Schemas ──────────────────────────────────────────────────

export const CustomerLocationSchema = z
  .object({
    gpsLat: z
      .union([z.number(), z.string()])
      .optional()
      .transform((val) => (val === undefined || val === null || val === "" ? undefined : Number(val)))
      .pipe(z.number().min(-90).max(90).optional()),
    gpsLon: z
      .union([z.number(), z.string()])
      .optional()
      .transform((val) => (val === undefined || val === null || val === "" ? undefined : Number(val)))
      .pipe(z.number().min(-180).max(180).optional()),
    gpsAccuracy: z
      .union([z.number(), z.string()])
      .optional()
      .transform((val) => (val === undefined || val === null || val === "" ? undefined : Number(val)))
      .pipe(z.number().min(0).max(1000000).optional()),
  })
  .strict();

export const CustomerPlanInstalledSchema = z
  .object({
    installed: z.boolean().optional().default(true),
  })
  .strict();

// ── Admin Action Schemas ─────────────────────────────────────────────────────

export const AdminResetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(6, "Password must be at least 6 characters.")
      .max(128, "Password cannot exceed 128 characters."),
  })
  .strict();

export const AdminBulkUpdateSchema = z
  .object({
    updates: z
      .array(
        z
          .object({
            plan_id: z.union([z.string().min(1).max(64), z.number().int().positive()]),
            used_gb: z.coerce.number().min(0, "Used GB cannot be negative.").max(10000, "Used GB cannot exceed 10,000."),
          })
          .strict()
      )
      .min(1, "At least one update is required.")
      .max(200, "Cannot submit more than 200 updates at once."),
  })
  .strict();

export const AdminCreateEsimSchema = z
  .object({
    provider_name: z.string().trim().min(1, "Provider name is required.").max(100, "Provider name too long."),
    provider_email: z.string().trim().email("Must be a valid email.").max(255, "Email too long."),
    provider_password: z.string().min(1, "Provider password is required.").max(255, "Password too long."),
    activation_code: z.string().trim().max(1000, "Activation code too long.").optional().nullable(),
    notes: z.string().trim().max(2000, "Notes too long.").optional().nullable(),
  })
  .strict();

export const AdminCreateCustomerSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, "Username must be at least 3 characters.")
      .max(32, "Username cannot exceed 32 characters.")
      .regex(/^[a-zA-Z0-9_-]+$/, "Username may only contain letters, numbers, underscores, and hyphens."),
    displayName: z
      .string()
      .trim()
      .min(1, "Display name cannot be empty.")
      .max(64, "Display name cannot exceed 64 characters.")
      .optional()
      .nullable(),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters.")
      .max(128, "Password cannot exceed 128 characters."),
    initialPlanId: z.string().trim().max(64).optional().nullable(),
  })
  .strict();

// ── AI Chat Schema ───────────────────────────────────────────────────────────

export const AiChatSchema = z
  .object({
    message: z
      .string()
      .trim()
      .min(1, "Message cannot be empty.")
      .max(1000, "Message cannot exceed 1000 characters."),
    conversation: z
      .array(
        z
          .object({
            role: z.string().max(20).optional(),
            content: z.string().max(3000).optional(),
            text: z.string().max(3000).optional(),
          })
          .passthrough()
      )
      .max(30, "Conversation history cannot exceed 30 messages.")
      .optional(),
    history: z
      .array(
        z
          .object({
            role: z.string().max(20).optional(),
            content: z.string().max(3000).optional(),
            text: z.string().max(3000).optional(),
          })
          .passthrough()
      )
      .max(30, "History cannot exceed 30 messages.")
      .optional(),
  })
  .passthrough();
