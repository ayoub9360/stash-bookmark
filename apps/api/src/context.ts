import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { Database } from "@stash/db";
import { isValidSessionToken, COOKIE_NAME } from "./session.js";
import { validateApiToken } from "./api-token.js";

export async function createContext(opts: CreateExpressContextOptions, db: Database) {
  // Check authentication: prefer httpOnly cookie, fallback to Bearer token
  const sessionCookie = (opts.req as any).cookies?.[COOKIE_NAME] as string | undefined;
  const authHeader = opts.req.headers.authorization;
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  let isAuthenticated = sessionCookie ? isValidSessionToken(sessionCookie) : false;

  // Try API token auth if session cookie didn't work
  if (!isAuthenticated && bearerToken) {
    isAuthenticated = await validateApiToken(db, bearerToken);
  }

  // Only trust x-forwarded-for if TRUST_PROXY is set (app is behind a reverse proxy)
  const ip = process.env.TRUST_PROXY
    ? (opts.req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      opts.req.socket.remoteAddress ||
      "unknown"
    : opts.req.socket.remoteAddress || "unknown";

  return {
    db,
    isAuthenticated,
    ip,
    res: opts.res,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
