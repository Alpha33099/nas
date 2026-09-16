import { NextRequest, NextResponse } from "next/server";

// ── Configuration (Environment Configurable with Secure Defaults) ─────────────

function getEnvInt(key: string, defaultVal: number): number {
  const val = process.env[key];
  if (!val) return defaultVal;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? defaultVal : parsed;
}

export const RATE_LIMIT_CONFIG = {
  // Auth routes (login, register, password reset)
  auth: {
    maxAttempts: getEnvInt("RATE_LIMIT_AUTH_MAX_ATTEMPTS", 5),
    windowMs: getEnvInt("RATE_LIMIT_AUTH_WINDOW_SEC", 900) * 1000, // 15 minutes default
    baseDelaySec: getEnvInt("RATE_LIMIT_AUTH_BASE_DELAY_SEC", 15), // Base backoff step
    maxDelaySec: getEnvInt("RATE_LIMIT_AUTH_MAX_DELAY_SEC", 900),  // Max backoff cap (15 min)
  },
  // Public endpoints (e.g. crypto session creation, AI chat, geo)
  public: {
    maxRequests: getEnvInt("RATE_LIMIT_PUBLIC_MAX", 60), // 60 req/min
    windowMs: 60 * 1000,
  },
  // Authenticated endpoints (logged-in customer & admin operations)
  authenticated: {
    maxRequests: getEnvInt("RATE_LIMIT_AUTH_USER_MAX", 180), // 180 req/min
    windowMs: 60 * 1000,
  },
};

// ── In-Memory State Store with Automatic TTL Garbage Collection ────────────────

interface AuthTrackerEntry {
  attempts: number;
  firstAttemptAt: number;
  lastAttemptAt: number;
  backoffUntil: number;
}

interface StandardTrackerEntry {
  count: number;
  resetAt: number;
}

const authStore = new Map<string, AuthTrackerEntry>();
const standardStore = new Map<string, StandardTrackerEntry>();

// Clean up stale entries every 5 minutes to prevent memory leaks
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of authStore.entries()) {
      if (now - entry.lastAttemptAt > RATE_LIMIT_CONFIG.auth.windowMs && now > entry.backoffUntil) {
        authStore.delete(key);
      }
    }
    for (const [key, entry] of standardStore.entries()) {
      if (now > entry.resetAt) {
        standardStore.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}

// ── Client IP Extraction ──────────────────────────────────────────────────────

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0].trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "127.0.0.1";
}

// ── 1. Auth Rate Limiter (Dual IP + Account with Exponential Backoff) ──────────

export function checkAuthRateLimit(
  clientIp: string,
  accountIdentifier?: string
): { allowed: true } | { allowed: false; response: NextResponse } {
  const now = Date.now();
  const keysToCheck = [`ip:${clientIp}`];
  if (accountIdentifier && accountIdentifier.trim()) {
    keysToCheck.push(`acc:${accountIdentifier.trim().toLowerCase()}`);
  }

  for (const key of keysToCheck) {
    const entry = authStore.get(key);
    if (entry && now < entry.backoffUntil) {
      const waitSeconds = Math.max(1, Math.ceil((entry.backoffUntil - now) / 1000));
      return {
        allowed: false,
        response: NextResponse.json(
          {
            error: `Too many failed attempts. Please wait ${waitSeconds} second${waitSeconds === 1 ? "" : "s"} before trying again.`,
            code: "RATE_LIMITED",
            retryAfter: waitSeconds,
          },
          {
            status: 429,
            headers: {
              "Retry-After": waitSeconds.toString(),
              "X-RateLimit-Limit": RATE_LIMIT_CONFIG.auth.maxAttempts.toString(),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": Math.ceil(entry.backoffUntil / 1000).toString(),
            },
          }
        ),
      };
    }
  }

  return { allowed: true };
}

/**
 * Call when an authentication attempt fails.
 * Applies exponential backoff once maxAttempts is reached.
 */
export function recordAuthFailure(clientIp: string, accountIdentifier?: string) {
  const now = Date.now();
  const keysToUpdate = [`ip:${clientIp}`];
  if (accountIdentifier && accountIdentifier.trim()) {
    keysToUpdate.push(`acc:${accountIdentifier.trim().toLowerCase()}`);
  }

  for (const key of keysToUpdate) {
    let entry = authStore.get(key);
    if (!entry || now - entry.firstAttemptAt > RATE_LIMIT_CONFIG.auth.windowMs) {
      entry = {
        attempts: 1,
        firstAttemptAt: now,
        lastAttemptAt: now,
        backoffUntil: 0,
      };
    } else {
      entry.attempts += 1;
      entry.lastAttemptAt = now;
    }

    // Exponential Backoff calculation:
    // Attempts 1 to maxAttempts: allowed without delay
    // Attempt maxAttempts + 1: baseDelaySec (15s)
    // Attempt maxAttempts + 2: 30s
    // Attempt maxAttempts + 3: 60s
    // Scaling exponentially up to maxDelaySec (15 min)
    if (entry.attempts > RATE_LIMIT_CONFIG.auth.maxAttempts) {
      const exponent = entry.attempts - RATE_LIMIT_CONFIG.auth.maxAttempts;
      const delaySec = Math.min(
        RATE_LIMIT_CONFIG.auth.baseDelaySec * Math.pow(2, exponent - 1),
        RATE_LIMIT_CONFIG.auth.maxDelaySec
      );
      entry.backoffUntil = now + delaySec * 1000;
    }

    authStore.set(key, entry);
  }
}

/**
 * Call upon successful authentication to reset the attempt counter.
 */
export function recordAuthSuccess(clientIp: string, accountIdentifier?: string) {
  authStore.delete(`ip:${clientIp}`);
  if (accountIdentifier) {
    authStore.delete(`acc:${accountIdentifier.trim().toLowerCase()}`);
  }
}

// ── 2. Standard Tiered Rate Limiter (Public vs Authenticated) ─────────────────

export function checkStandardRateLimit(
  tier: "public" | "authenticated",
  identifier: string
): { allowed: true } | { allowed: false; response: NextResponse } {
  const now = Date.now();
  const config = RATE_LIMIT_CONFIG[tier];
  const key = `${tier}:${identifier}`;

  let entry = standardStore.get(key);
  if (!entry || now > entry.resetAt) {
    entry = {
      count: 1,
      resetAt: now + config.windowMs,
    };
    standardStore.set(key, entry);
    return { allowed: true };
  }

  entry.count += 1;
  if (entry.count > config.maxRequests) {
    const waitSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    return {
      allowed: false,
      response: NextResponse.json(
        {
          error: "Rate limit exceeded. Please slow down your requests.",
          code: "TOO_MANY_REQUESTS",
          retryAfter: waitSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": waitSeconds.toString(),
            "X-RateLimit-Limit": config.maxRequests.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": Math.ceil(entry.resetAt / 1000).toString(),
          },
        }
      ),
    };
  }

  standardStore.set(key, entry);
  return { allowed: true };
}
