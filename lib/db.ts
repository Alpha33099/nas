import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

function getCleanUrl(): string {
  let url = process.env.DATABASE_URL || "";
  url = url.trim();

  // Strip "DATABASE_URL=" prefix if accidentally pasted in Vercel value field
  if (url.startsWith("DATABASE_URL=")) {
    url = url.substring("DATABASE_URL=".length).trim();
  }

  // Strip surrounding quotes if wrapped
  if (
    (url.startsWith('"') && url.endsWith('"')) ||
    (url.startsWith("'") && url.endsWith("'"))
  ) {
    url = url.slice(1, -1).trim();
  }

  return url;
}

let dbInstance: NeonQueryFunction<false, false> | null = null;

function getSql(): NeonQueryFunction<false, false> {
  if (!dbInstance) {
    const cleanUrl = getCleanUrl();

    if (!cleanUrl) {
      // Return a safe no-op query function during static build collection if unset
      return ((..._args: any[]) => Promise.resolve([])) as any;
    }

    dbInstance = neon(cleanUrl);
  }

  return dbInstance;
}

/**
 * Resilient lazy proxy:
 * 1. Safe during build-time module evaluation
 * 2. Automatically strips accidental quotes or prefixes in Vercel env settings
 * 3. Connects smoothly to Neon at runtime
 */
export const sql: NeonQueryFunction<false, false> = new Proxy((() => {}) as any, {
  apply(_target, thisArg, argArray) {
    const fn = getSql();
    return Reflect.apply(fn as any, thisArg, argArray);
  },
  get(_target, prop, receiver) {
    const fn = getSql();
    return Reflect.get(fn as any, prop, receiver);
  },
});