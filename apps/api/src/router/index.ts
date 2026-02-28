import { router } from "../trpc.js";
import { bookmarkRouter } from "./bookmark.js";
import { categoryRouter } from "./category.js";
import { collectionRouter } from "./collection.js";
import { searchRouter } from "./search.js";
import { authRouter } from "./auth.js";
import { dashboardRouter } from "./dashboard.js";
import { apiTokenRouter } from "./api-token.js";

export const appRouter = router({
  auth: authRouter,
  bookmark: bookmarkRouter,
  category: categoryRouter,
  collection: collectionRouter,
  search: searchRouter,
  dashboard: dashboardRouter,
  apiToken: apiTokenRouter,
});

export type AppRouter = typeof appRouter;
