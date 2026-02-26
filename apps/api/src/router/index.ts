import { router } from "../trpc.js";
import { bookmarkRouter } from "./bookmark.js";
import { categoryRouter } from "./category.js";
import { collectionRouter } from "./collection.js";
import { searchRouter } from "./search.js";
import { authRouter } from "./auth.js";
import { dashboardRouter } from "./dashboard.js";

export const appRouter = router({
  auth: authRouter,
  bookmark: bookmarkRouter,
  category: categoryRouter,
  collection: collectionRouter,
  search: searchRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;
