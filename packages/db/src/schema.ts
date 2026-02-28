import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  varchar,
  index,
  primaryKey,
  customType,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Custom type for pgvector
const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return "vector(1536)";
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: unknown): number[] {
    return String(value)
      .replace(/[\[\]]/g, "")
      .split(",")
      .map(Number);
  },
});

// Custom type for tsvector
const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

export const bookmarks = pgTable(
  "bookmarks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    url: text("url").notNull(),
    title: text("title"),
    description: text("description"),
    summary: text("summary"),
    content: text("content"),
    html_snapshot: text("html_snapshot"),
    favicon_url: text("favicon_url"),
    og_image_url: text("og_image_url"),
    domain: text("domain"),
    language: varchar("language", { length: 10 }),
    published_at: timestamp("published_at", { withTimezone: true }),
    reading_time_min: integer("reading_time_min"),
    category: text("category"),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    is_favorite: boolean("is_favorite").notNull().default(false),
    is_archived: boolean("is_archived").notNull().default(false),
    is_read: boolean("is_read").notNull().default(false),
    processing_status: varchar("processing_status", { length: 20 })
      .notNull()
      .default("pending"),
    embedding: vector("embedding"),
    search_vector: tsvector("search_vector"),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("bookmarks_url_idx").on(table.url),
    index("bookmarks_domain_idx").on(table.domain),
    index("bookmarks_category_idx").on(table.category),
    index("bookmarks_created_at_idx").on(table.created_at),
    index("bookmarks_search_vector_idx").using("gin", table.search_vector),
  ]
);

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  icon: text("icon"),
  parent_id: uuid("parent_id"),
  sort_order: integer("sort_order").notNull().default(0),
});

export const collections = pgTable("collections", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bookmarkCollections = pgTable(
  "bookmark_collections",
  {
    bookmark_id: uuid("bookmark_id")
      .notNull()
      .references(() => bookmarks.id, { onDelete: "cascade" }),
    collection_id: uuid("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.bookmark_id, table.collection_id] })]
);

export const apiTokens = pgTable("api_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().default("default"),
  token_hash: text("token_hash").notNull().unique(),
  last_used_at: timestamp("last_used_at", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type BookmarkInsert = typeof bookmarks.$inferInsert;
export type BookmarkSelect = typeof bookmarks.$inferSelect;
export type CategoryInsert = typeof categories.$inferInsert;
export type CategorySelect = typeof categories.$inferSelect;
export type CollectionInsert = typeof collections.$inferInsert;
export type CollectionSelect = typeof collections.$inferSelect;
export type ApiTokenInsert = typeof apiTokens.$inferInsert;
export type ApiTokenSelect = typeof apiTokens.$inferSelect;
