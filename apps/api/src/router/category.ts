import { z } from "zod";
import { eq } from "drizzle-orm";
import { categories } from "@stash/db";
import { createCategorySchema } from "@stash/shared";
import { router, protectedProcedure } from "../trpc.js";

export const categoryRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(categories).orderBy(categories.sort_order);
  }),

  create: protectedProcedure.input(createCategorySchema).mutation(async ({ ctx, input }) => {
    const [category] = await ctx.db
      .insert(categories)
      .values(input)
      .returning();
    return category;
  }),

  delete: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(categories).where(eq(categories.id, input.id));
    return { success: true };
  }),
});
