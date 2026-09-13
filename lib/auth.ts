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

function getAdminSecret(): string {
  const secret = process.env.JWT_SECRET_ADMIN;
  if (!secret) throw new Error("JWT_SECRET_ADMIN is not set.");
  return secret;
}

function getCustomerSecret(): string {
  const secret = process.env.JWT_SECRET_CUSTOMER;
  if (!secret) throw new Error("JWT_SECRET_CUSTOMER is not set.");
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