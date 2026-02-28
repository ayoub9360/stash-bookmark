import { sql } from "drizzle-orm";
import type { Database } from "@stash/db";
import type { SearchResult, Bookmark } from "@stash/shared";
import { generateEmbedding } from "@stash/ai";
import type OpenAI from "openai";

interface RankedItem {
  id: string;
  score: number;
}

function reciprocalRankFusion(
  ...resultSets: RankedItem[][]
): Map<string, number> {
  const k = 60;
  const scores = new Map<string, number>();

  for (const results of resultSets) {
    for (let rank = 0; rank < results.length; rank++) {
      const item = results[rank]!;
      const rrf = 1 / (k + rank + 1);
      scores.set(item.id, (scores.get(item.id) ?? 0) + rrf);
    }
  }

  return scores;
}

export async function hybridSearch(
  db: Database,
  openai: OpenAI,
  query: string,
  options: {
    category?: string;
    tags?: string[];
    domain?: string;
    is_favorite?: boolean;
    limit?: number;
    offset?: number;
  } = {},
): Promise<{ results: SearchResult[]; total: number }> {
  const { limit = 20, offset = 0 } = options;

  // Build parameterized filter conditions
  const filters: ReturnType<typeof sql>[] = [];
  if (options.category) {
    filters.push(sql`category = ${options.category}`);
  }
  if (options.domain) {
    filters.push(sql`domain = ${options.domain}`);
  }
  if (options.is_favorite !== undefined) {
    filters.push(sql`is_favorite = ${options.is_favorite}`);
  }
  if (options.tags && options.tags.length > 0) {
    filters.push(sql`tags && ${options.tags}::text[]`);
  }

  // Combine filters into a single WHERE fragment
  const whereFragment =
    filters.length > 0
      ? sql`WHERE ${sql.join(filters, sql` AND `)}`
      : sql``;

  let semanticResults: RankedItem[] = [];
  let keywordResults: RankedItem[] = [];

  // Semantic search
  try {
    const embedding = await generateEmbedding(openai, query);
    const vectorStr = `[${embedding.join(",")}]`;

    const semanticWhere =
      filters.length > 0
        ? sql`WHERE ${sql.join(filters, sql` AND `)} AND embedding IS NOT NULL`
        : sql`WHERE embedding IS NOT NULL`;

    const rows = await db.execute<{ id: string; score: number }>(
      sql`SELECT id, 1 - (embedding <=> ${vectorStr}::vector) as score
          FROM bookmarks
          ${semanticWhere}
          AND 1 - (embedding <=> ${vectorStr}::vector) > 0.25
          ORDER BY embedding <=> ${vectorStr}::vector
          LIMIT 50`,
    );
    semanticResults = rows.map((r) => ({ id: r.id, score: Number(r.score) }));
  } catch {
    // Semantic search failed, continue with keyword only
  }

  // Keyword search with parameterized query
  const keywordWhere =
    filters.length > 0
      ? sql`WHERE ${sql.join(filters, sql` AND `)} AND search_vector @@ plainto_tsquery('simple', ${query})`
      : sql`WHERE search_vector @@ plainto_tsquery('simple', ${query})`;

  const keywordRows = await db.execute<{ id: string; score: number }>(
    sql`SELECT id, ts_rank('{0.1, 0.2, 0.4, 1.0}', search_vector, plainto_tsquery('simple', ${query})) as score
        FROM bookmarks
        ${keywordWhere}
        ORDER BY score DESC
        LIMIT 50`,
  );
  keywordResults = keywordRows.map((r) => ({ id: r.id, score: Number(r.score) }));

  // Merge with RRF
  const fusedScores = reciprocalRankFusion(semanticResults, keywordResults);

  // Sort by fused score
  const sortedIds = [...fusedScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(offset, offset + limit);

  if (sortedIds.length === 0) {
    return { results: [], total: 0 };
  }

  // Fetch full bookmark data with IN clause
  const idFragments = sortedIds.map(([id]) => sql`${id}::uuid`);
  const bookmarkRows = await db.execute<Record<string, unknown>>(
    sql`SELECT * FROM bookmarks WHERE id IN (${sql.join(idFragments, sql`, `)})`,
  );

  const bookmarkMap = new Map<string, Record<string, unknown>>();
  for (const row of bookmarkRows) {
    bookmarkMap.set(row.id as string, row);
  }

  const results: SearchResult[] = sortedIds
    .map(([id, score]) => {
      const row = bookmarkMap.get(id);
      if (!row) return null;
      return {
        bookmark: rowToBookmark(row),
        score,
      };
    })
    .filter((r): r is SearchResult => r !== null);

  return { results, total: fusedScores.size };
}

function rowToBookmark(row: Record<string, unknown>): Bookmark {
  return {
    id: row.id as string,
    url: row.url as string,
    title: (row.title as string) ?? null,
    description: (row.description as string) ?? null,
    summary: (row.summary as string) ?? null,
    content: (row.content as string) ?? null,
    html_snapshot: (row.html_snapshot as string) ?? null,
    favicon_url: (row.favicon_url as string) ?? null,
    og_image_url: (row.og_image_url as string) ?? null,
    domain: (row.domain as string) ?? null,
    language: (row.language as string) ?? null,
    published_at: row.published_at ? String(row.published_at) : null,
    reading_time_min: (row.reading_time_min as number) ?? null,
    category: (row.category as string) ?? null,
    tags: (row.tags as string[]) ?? [],
    is_favorite: (row.is_favorite as boolean) ?? false,
    processing_status: (row.processing_status as Bookmark["processing_status"]) ?? "pending",
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}
