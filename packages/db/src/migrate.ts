import postgres from "postgres";

export async function runMigrations(connectionString: string) {
  const sql = postgres(connectionString, { max: 1 });

  try {
    console.log("[db] Running migrations...");

    // Enable pgvector extension
    await sql`CREATE EXTENSION IF NOT EXISTS vector`;

    // Bookmarks table
    await sql`
      CREATE TABLE IF NOT EXISTS bookmarks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        url TEXT NOT NULL,
        title TEXT,
        description TEXT,
        summary TEXT,
        content TEXT,
        html_snapshot TEXT,
        favicon_url TEXT,
        og_image_url TEXT,
        domain TEXT,
        language VARCHAR(10),
        published_at TIMESTAMPTZ,
        reading_time_min INTEGER,
        category TEXT,
        tags TEXT[] NOT NULL DEFAULT '{}'::text[],
        is_favorite BOOLEAN NOT NULL DEFAULT false,
        is_archived BOOLEAN NOT NULL DEFAULT false,
        is_read BOOLEAN NOT NULL DEFAULT false,
        processing_status VARCHAR(20) NOT NULL DEFAULT 'pending',
        embedding vector(1536),
        search_vector tsvector,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;

    // Bookmarks indexes
    await sql`CREATE INDEX IF NOT EXISTS bookmarks_url_idx ON bookmarks (url)`;
    await sql`CREATE INDEX IF NOT EXISTS bookmarks_domain_idx ON bookmarks (domain)`;
    await sql`CREATE INDEX IF NOT EXISTS bookmarks_category_idx ON bookmarks (category)`;
    await sql`CREATE INDEX IF NOT EXISTS bookmarks_created_at_idx ON bookmarks (created_at)`;
    await sql`CREATE INDEX IF NOT EXISTS bookmarks_search_vector_idx ON bookmarks USING gin (search_vector)`;

    // Categories table
    await sql`
      CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        icon TEXT,
        parent_id UUID,
        sort_order INTEGER NOT NULL DEFAULT 0
      )
    `;

    // Collections table
    await sql`
      CREATE TABLE IF NOT EXISTS collections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;

    // Bookmark-Collections M2M table
    await sql`
      CREATE TABLE IF NOT EXISTS bookmark_collections (
        bookmark_id UUID NOT NULL REFERENCES bookmarks(id) ON DELETE CASCADE,
        collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
        PRIMARY KEY (bookmark_id, collection_id)
      )
    `;

    // API tokens table
    await sql`
      CREATE TABLE IF NOT EXISTS api_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL DEFAULT 'default',
        token_hash TEXT NOT NULL UNIQUE,
        last_used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;

    // Rebuild weighted search_vector for all completed bookmarks
    await sql`
      UPDATE bookmarks SET search_vector =
        setweight(to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(array_to_string(tags, ' '), '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(summary, '') || ' ' || coalesce(description, '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(domain, '') || ' ' || regexp_replace(coalesce(url, ''), '[/:._\\-]+', ' ', 'g')), 'C') ||
        setweight(to_tsvector('simple', coalesce(content, '')), 'D')
      WHERE processing_status = 'completed'
    `;

    console.log("[db] Migrations complete.");
  } finally {
    await sql.end();
  }
}
