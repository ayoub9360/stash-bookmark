import { z } from "zod";
import { eq, desc, asc, and, sql, gte, lte } from "drizzle-orm";
import { bookmarks } from "@stash/db";
import {
  createBookmarkSchema,
  updateBookmarkSchema,
  bookmarkListQuerySchema,
} from "@stash/shared";
import { router, protectedProcedure } from "../trpc.js";
import { addBookmarkJob } from "../queue.js";

export const bookmarkRouter = router({
  filterOptions: protectedProcedure.query(async ({ ctx }) => {
    const [tagsResult, domainsResult] = await Promise.all([
      ctx.db
        .select({ tag: sql<string>`unnest(${bookmarks.tags})` })
        .from(bookmarks)
        .where(sql`array_length(${bookmarks.tags}, 1) > 0`)
        .groupBy(sql`unnest(${bookmarks.tags})`)
        .orderBy(sql`unnest(${bookmarks.tags})`),
      ctx.db
        .select({
          domain: bookmarks.domain,
          count: sql<number>`count(*)::int`,
        })
        .from(bookmarks)
        .where(sql`${bookmarks.domain} IS NOT NULL`)
        .groupBy(bookmarks.domain)
        .orderBy(desc(sql`count(*)`)),
    ]);

    return {
      tags: tagsResult.map((r) => r.tag),
      domains: domainsResult as { domain: string; count: number }[],
    };
  }),

  list: protectedProcedure.input(bookmarkListQuerySchema).query(async ({ ctx, input }) => {
    const conditions = [];

    if (input.category) {
      conditions.push(eq(bookmarks.category, input.category));
    }
    if (input.domain) {
      conditions.push(eq(bookmarks.domain, input.domain));
    }
    if (input.is_favorite !== undefined) {
      conditions.push(eq(bookmarks.is_favorite, input.is_favorite));
    }
    if (input.tags && input.tags.length > 0) {
      conditions.push(
        sql`${bookmarks.tags} && ${input.tags}::text[]`,
      );
    }
    if (input.created_after) {
      conditions.push(gte(bookmarks.created_at, new Date(input.created_after)));
    }
    if (input.created_before) {
      conditions.push(lte(bookmarks.created_at, new Date(input.created_before)));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const orderCol = bookmarks[input.sort_by];
    const orderFn = input.sort_order === "asc" ? asc : desc;

    const [items, countResult] = await Promise.all([
      ctx.db
        .select({
          id: bookmarks.id,
          url: bookmarks.url,
          title: bookmarks.title,
          description: bookmarks.description,
          summary: bookmarks.summary,
          favicon_url: bookmarks.favicon_url,
          og_image_url: bookmarks.og_image_url,
          domain: bookmarks.domain,
          language: bookmarks.language,
          reading_time_min: bookmarks.reading_time_min,
          category: bookmarks.category,
          tags: bookmarks.tags,
          is_favorite: bookmarks.is_favorite,
          processing_status: bookmarks.processing_status,
          created_at: bookmarks.created_at,
          updated_at: bookmarks.updated_at,
        })
        .from(bookmarks)
        .where(where)
        .orderBy(orderFn(orderCol))
        .limit(input.limit)
        .offset(input.offset),
      ctx.db
        .select({ count: sql<number>`count(*)::int` })
        .from(bookmarks)
        .where(where),
    ]);

    return {
      items,
      total: countResult[0]?.count ?? 0,
      limit: input.limit,
      offset: input.offset,
    };
  }),

  get: protectedProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    const result = await ctx.db
      .select()
      .from(bookmarks)
      .where(eq(bookmarks.id, input.id))
      .limit(1);
    return result[0] ?? null;
  }),

  create: protectedProcedure.input(createBookmarkSchema).mutation(async ({ ctx, input }) => {
    const [bookmark] = await ctx.db
      .insert(bookmarks)
      .values({
        url: input.url,
        tags: input.tags ?? [],
        processing_status: "pending",
      })
      .returning();

    // Add to processing queue
    await addBookmarkJob(bookmark!.id, input.url);

    return bookmark;
  }),

  update: protectedProcedure
    .input(z.object({ id: z.string().uuid(), data: updateBookmarkSchema }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(bookmarks)
        .set({ ...input.data, updated_at: new Date() })
        .where(eq(bookmarks.id, input.id))
        .returning();
      return updated;
    }),

  delete: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(bookmarks).where(eq(bookmarks.id, input.id));
    return { success: true };
  }),

  toggleFavorite: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(bookmarks)
        .set({
          is_favorite: sql`NOT ${bookmarks.is_favorite}`,
          updated_at: new Date(),
        })
        .where(eq(bookmarks.id, input.id))
        .returning();
      return updated;
    }),

});
