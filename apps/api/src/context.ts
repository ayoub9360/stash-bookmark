import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { Database } from "@stash/db";

export function createContext(opts: CreateExpressContextOptions, db: Database) {
  const authHeader = opts.req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const isAuthenticated = token === process.env.PASSWORD;

  return {
    db,
    isAuthenticated,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
