import { desc, sql } from "drizzle-orm";
import { bookmarks } from "@stash/db";
import { router, protectedProcedure } from "../trpc.js";

export const dashboardRouter = router({
  stats: protectedProcedure.query(async ({ ctx }) => {
    const [totals] = await ctx.db
      .select({
        total_bookmarks: sql<number>`count(*)::int`,
        total_favorites: sql<number>`count(*) filter (where ${bookmarks.is_favorite})::int`,
      })
      .from(bookmarks);

    const topDomains = await ctx.db
      .select({
        domain: bookmarks.domain,
        count: sql<number>`count(*)::int`,
      })
      .from(bookmarks)
      .where(sql`${bookmarks.domain} IS NOT NULL`)
      .groupBy(bookmarks.domain)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    const topCategories = await ctx.db
      .select({
        category: bookmarks.category,
        count: sql<number>`count(*)::int`,
      })
      .from(bookmarks)
      .where(sql`${bookmarks.category} IS NOT NULL`)
      .groupBy(bookmarks.category)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    const recentBookmarks = await ctx.db
      .select({
        id: bookmarks.id,
        url: bookmarks.url,
        title: bookmarks.title,
        description: bookmarks.description,
        summary: bookmarks.summary,
        favicon_url: bookmarks.favicon_url,
        og_image_url: bookmarks.og_image_url,
        domain: bookmarks.domain,
        category: bookmarks.category,
        tags: bookmarks.tags,
        is_favorite: bookmarks.is_favorite,
        processing_status: bookmarks.processing_status,
        created_at: bookmarks.created_at,
        updated_at: bookmarks.updated_at,
      })
      .from(bookmarks)
      .orderBy(desc(bookmarks.created_at))
      .limit(10);

    return {
      total_bookmarks: totals?.total_bookmarks ?? 0,
      total_favorites: totals?.total_favorites ?? 0,
      top_domains: topDomains as { domain: string; count: number }[],
      top_categories: topCategories as { category: string; count: number }[],
      recent_bookmarks: recentBookmarks,
    };
  }),
});
