import OpenAI from "openai";
import { searchQuerySchema } from "@stash/shared";
import { hybridSearch } from "@stash/search";
import { router, protectedProcedure } from "../trpc.js";

export const searchRouter = router({
  query: protectedProcedure.input(searchQuerySchema).query(async ({ ctx, input }) => {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return hybridSearch(ctx.db, openai, input.query, {
      category: input.category,
      tags: input.tags,
      domain: input.domain,
      is_favorite: input.is_favorite,
      is_archived: input.is_archived,
      is_read: input.is_read,
      limit: input.limit,
      offset: input.offset,
    });
  }),
});
