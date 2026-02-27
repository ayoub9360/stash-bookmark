import { createHmac } from "node:crypto";

const SESSION_SECRET = process.env.SESSION_SECRET || process.env.PASSWORD || "stash-fallback-secret";

/**
 * Generate a deterministic session token from the password.
 * Since the app is single-tenant, the token is simply an HMAC of a fixed payload
 * using the password as part of the secret. This survives server restarts.
 */
export function generateSessionToken(): string {
  return createHmac("sha256", SESSION_SECRET)
    .update("stash-session-token")
    .digest("hex");
}

export function isValidSessionToken(token: string): boolean {
  return token === generateSessionToken();
}

export const COOKIE_NAME = "stash-session";

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};
