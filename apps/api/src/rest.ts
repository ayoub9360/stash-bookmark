import { Router } from "express";
import { z } from "zod";
import { desc } from "drizzle-orm";
import { bookmarks, type Database } from "@stash/db";
import { validateApiToken } from "./api-token.js";
import { addBookmarkJob } from "./queue.js";

const createBookmarkBody = z.object({
  url: z.string().url(),
  tags: z.array(z.string()).optional(),
  content: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
      textContent: z.string().max(500_000).optional(),
      htmlSnapshot: z.string().max(500_000).optional(),
      ogImageUrl: z.string().optional(),
      faviconUrl: z.string().optional(),
    })
    .optional(),
});

const listBookmarksQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export function createRestRouter(db: Database): Router {
  const router = Router();

  // Auth middleware for all /api/v1 routes
  router.use(async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token || !(await validateApiToken(db, token))) {
      res.status(401).json({ error: "Invalid or missing API token" });
      return;
    }

    next();
  });

  // GET /api/v1/verify — Test connection
  router.get("/verify", (_req, res) => {
    res.json({ ok: true, version: "1.0.0" });
  });

  // POST /api/v1/bookmarks — Create bookmark (with optional pre-extracted content)
  router.post("/bookmarks", async (req, res) => {
    try {
      const body = createBookmarkBody.parse(req.body);

      const domain = (() => {
        try {
          return new URL(body.url).hostname.replace(/^www\./, "");
        } catch {
          return null;
        }
      })();

      const [bookmark] = await db
        .insert(bookmarks)
        .values({
          url: body.url,
          tags: body.tags ?? [],
          // Pre-fill from extension content if provided
          title: body.content?.title ?? null,
          description: body.content?.description ?? null,
          content: body.content?.textContent ?? null,
          html_snapshot: body.content?.htmlSnapshot ?? null,
          og_image_url: body.content?.ogImageUrl ?? null,
          favicon_url: body.content?.faviconUrl ?? null,
          domain,
          processing_status: "pending",
        })
        .returning({
          id: bookmarks.id,
          url: bookmarks.url,
          title: bookmarks.title,
          processing_status: bookmarks.processing_status,
          created_at: bookmarks.created_at,
        });

      // Enqueue processing — worker will skip fetch if content already present
      await addBookmarkJob(bookmark!.id, body.url, !!body.content?.textContent);

      res.status(201).json(bookmark);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request body", details: err.errors });
        return;
      }
      console.error("REST POST /bookmarks error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/v1/bookmarks — List recent bookmarks
  router.get("/bookmarks", async (req, res) => {
    try {
      const query = listBookmarksQuery.parse(req.query);

      const items = await db
        .select({
          id: bookmarks.id,
          url: bookmarks.url,
          title: bookmarks.title,
          favicon_url: bookmarks.favicon_url,
          processing_status: bookmarks.processing_status,
          created_at: bookmarks.created_at,
        })
        .from(bookmarks)
        .orderBy(desc(bookmarks.created_at))
        .limit(query.limit)
        .offset(query.offset);

      res.json({ bookmarks: items, total: items.length });
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid query params", details: err.errors });
        return;
      }
      console.error("REST GET /bookmarks error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}
