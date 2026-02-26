import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { collections, bookmarkCollections, bookmarks } from "@stash/db";
import { createCollectionSchema, updateCollectionSchema } from "@stash/shared";
import { router, protectedProcedure } from "../trpc.js";

export const collectionRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(collections).orderBy(collections.created_at);
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [collection] = await ctx.db
        .select()
        .from(collections)
        .where(eq(collections.id, input.id))
        .limit(1);
      if (!collection) return null;

      const items = await ctx.db
        .select({ bookmark: bookmarks })
        .from(bookmarkCollections)
        .innerJoin(bookmarks, eq(bookmarkCollections.bookmark_id, bookmarks.id))
        .where(eq(bookmarkCollections.collection_id, input.id));

      return { ...collection, bookmarks: items.map((i) => i.bookmark) };
    }),

  create: protectedProcedure.input(createCollectionSchema).mutation(async ({ ctx, input }) => {
    const [collection] = await ctx.db.insert(collections).values(input).returning();
    return collection;
  }),

  update: protectedProcedure
    .input(z.object({ id: z.string().uuid(), data: updateCollectionSchema }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(collections)
        .set(input.data)
        .where(eq(collections.id, input.id))
        .returning();
      return updated;
    }),

  delete: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(collections).where(eq(collections.id, input.id));
    return { success: true };
  }),

  addBookmark: protectedProcedure
    .input(z.object({ collection_id: z.string().uuid(), bookmark_id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .insert(bookmarkCollections)
        .values({ collection_id: input.collection_id, bookmark_id: input.bookmark_id })
        .onConflictDoNothing();
      return { success: true };
    }),

  removeBookmark: protectedProcedure
    .input(z.object({ collection_id: z.string().uuid(), bookmark_id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(bookmarkCollections)
        .where(
          sql`${bookmarkCollections.collection_id} = ${input.collection_id} AND ${bookmarkCollections.bookmark_id} = ${input.bookmark_id}`,
        );
      return { success: true };
    }),
});
