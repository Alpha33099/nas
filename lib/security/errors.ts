import crypto from "crypto";
import { NextResponse } from "next/server";

export interface SafeErrorOptions {
  status?: number;
  clientMessage?: string;
  context?: Record<string, unknown>;
}

/**
 * Strips all database connection strings, stack traces, and internal file paths
 * from user-facing responses. Logs full diagnostic details securely server-side.
 */
export function safeErrorResponse(
  error: unknown,
  options?: SafeErrorOptions
): NextResponse {
  const incidentId = `SEC-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const status = options?.status ?? 500;
  const clientMessage =
    options?.clientMessage ??
    "An unexpected internal error occurred. Please try again later.";

  // Log full detailed trace server-side with correlation ref
  console.error(`[${incidentId}] Internal Server Error:`, {
    status,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : error,
    context: options?.context,
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json(
    {
      error: clientMessage,
      ref: incidentId,
    },
    { status }
  );
}
