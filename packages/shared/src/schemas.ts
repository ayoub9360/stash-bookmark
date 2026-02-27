import { z } from "zod";

export const createBookmarkSchema = z.object({
  url: z.string().url(),
  tags: z.array(z.string()).optional(),
});

export const updateBookmarkSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  category: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  is_favorite: z.boolean().optional(),
});

export const searchQuerySchema = z.object({
  query: z.string().min(1),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  domain: z.string().optional(),
  is_favorite: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

export const bookmarkListQuerySchema = z.object({
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  domain: z.string().optional(),
  is_favorite: z.boolean().optional(),
  created_after: z.string().datetime().optional(),
  created_before: z.string().datetime().optional(),
  sort_by: z.enum(["created_at", "updated_at", "title", "reading_time_min"]).default("created_at"),
  sort_order: z.enum(["asc", "desc"]).default("desc"),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

export const createCollectionSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
});

export const updateCollectionSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
});

export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  icon: z.string().optional(),
  parent_id: z.string().uuid().nullable().optional(),
});

export const loginSchema = z.object({
  password: z.string().min(8),
});
