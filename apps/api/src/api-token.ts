import { randomBytes, createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { apiTokens, type Database } from "@stash/db";

const TOKEN_PREFIX = "stash_";

/** Generate a new API token. Returns the plaintext token (shown once). */
export function generateApiToken(): string {
  return TOKEN_PREFIX + randomBytes(32).toString("hex");
}

/** Hash a plaintext token for storage. */
export function hashToken(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

/** Validate a Bearer token against the api_tokens table. Returns true if valid. */
export async function validateApiToken(
  db: Database,
  plaintext: string,
): Promise<boolean> {
  if (!plaintext.startsWith(TOKEN_PREFIX)) return false;

  const hash = hashToken(plaintext);
  const result = await db
    .select({ id: apiTokens.id })
    .from(apiTokens)
    .where(eq(apiTokens.token_hash, hash))
    .limit(1);

  if (result.length === 0) return false;

  // Update last_used_at (fire and forget)
  db.update(apiTokens)
    .set({ last_used_at: new Date() })
    .where(eq(apiTokens.id, result[0]!.id))
    .then(() => {})
    .catch(() => {});

  return true;
}
