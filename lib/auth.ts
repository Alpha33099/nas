import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

// ── Types ───────────────────────────────────────────────

export interface AdminPayload {
  id: string;
  username: string;
  role: "admin";
}

export interface CustomerPayload {
  id: string;
  username: string;
  role: "customer";
}

// ── Constants ───────────────────────────────────────────

const ADMIN_COOKIE = "admin_session";
const CUSTOMER_COOKIE = "customer_session";
const TOKEN_EXPIRY = "8h"; // sessions last 8 hours

// ── Helpers to get secrets ──────────────────────────────

const DEV_FALLBACK_ADMIN_SECRET = "156b9a09f80c3d820f811b5343469508ef916fd814d2d7cb32ef31daf977dedd07f935b0962da15c6303e7cce33921e763caf9d945f1b530a9d410761dcf6f4d";
const DEV_FALLBACK_CUSTOMER_SECRET = "22d6acaa6e9a63c5fe7b6735fe0bd45e6195d47f88041d21448bd0f8786a43058222ebc5f64fc76b07268a974f9d71d868ea2cd17a9bd178b6bc6a86320c18c9";

function getAdminSecret(): string {
  const secret = process.env.JWT_SECRET_ADMIN || (process.env as any).JMT_SECRET_ADMIN;
  if (!secret) {
    console.warn("[AUTH WARNING] JWT_SECRET_ADMIN not configured in environment. Using fallback secret.");
    return DEV_FALLBACK_ADMIN_SECRET;
  }
  return secret;
}

function getCustomerSecret(): string {
  const secret = process.env.JWT_SECRET_CUSTOMER || (process.env as any).JMT_SECRET_CUSTOMER;
  if (!secret) {
    console.warn("[AUTH WARNING] JWT_SECRET_CUSTOMER not configured in environment. Using fallback secret.");
    return DEV_FALLBACK_CUSTOMER_SECRET;
  }
  return secret;
}

// ── Cookie options ──────────────────────────────────────

function getCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 8 * 60 * 60, // 8 hours in seconds
  };
}

// ── Admin Auth ──────────────────────────────────────────

export function createAdminToken(payload: Omit<AdminPayload, "role">): string {
  return jwt.sign(
    { ...payload, role: "admin" },
    getAdminSecret(),
    { expiresIn: TOKEN_EXPIRY }
  );
}

export async function verifyAdminToken(): Promise<AdminPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_COOKIE)?.value;
    if (!token) return null;

    const decoded = jwt.verify(token, getAdminSecret()) as AdminPayload;
    if (decoded.role !== "admin") return null;

    return decoded;
  } catch {
    return null;
  }
}

export async function setAdminCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, token, getCookieOptions());
}

export async function clearAdminCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, "", { ...getCookieOptions(), maxAge: 0 });
}

// ── Customer Auth ───────────────────────────────────────

export function createCustomerToken(payload: Omit<CustomerPayload, "role">): string {
  return jwt.sign(
    { ...payload, role: "customer" },
    getCustomerSecret(),
    { expiresIn: TOKEN_EXPIRY }
  );
}

export async function verifyCustomerToken(): Promise<CustomerPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(CUSTOMER_COOKIE)?.value;
    if (!token) return null;

    const decoded = jwt.verify(token, getCustomerSecret()) as CustomerPayload;
    if (decoded.role !== "customer") return null;

    return decoded;
  } catch {
    return null;
  }
}

export async function setCustomerCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(CUSTOMER_COOKIE, token, getCookieOptions());
}

export async function clearCustomerCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(CUSTOMER_COOKIE, "", { ...getCookieOptions(), maxAge: 0 });
}