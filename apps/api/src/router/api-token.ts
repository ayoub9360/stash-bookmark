import { apiTokens } from "@stash/db";
import { desc } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc.js";
import { generateApiToken, hashToken } from "../api-token.js";

export const apiTokenRouter = router({
  /** Get current token info (without the plaintext). */
  get: protectedProcedure.query(async ({ ctx }) => {
    const result = await ctx.db
      .select({
        id: apiTokens.id,
        name: apiTokens.name,
        last_used_at: apiTokens.last_used_at,
        created_at: apiTokens.created_at,
      })
      .from(apiTokens)
      .orderBy(desc(apiTokens.created_at))
      .limit(1);

    return result[0] ?? null;
  }),

  /** Generate a new token (deletes any existing one). Returns plaintext once. */
  generate: protectedProcedure.mutation(async ({ ctx }) => {
    // Delete all existing tokens (single-tenant: one token at a time)
    await ctx.db.delete(apiTokens);

    const plaintext = generateApiToken();
    const hash = hashToken(plaintext);

    await ctx.db.insert(apiTokens).values({
      name: "default",
      token_hash: hash,
    });

    return { token: plaintext };
  }),

  /** Revoke the current token. */
  revoke: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db.delete(apiTokens);
    return { success: true };
  }),
});
