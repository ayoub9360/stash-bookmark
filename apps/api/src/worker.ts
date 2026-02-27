import { Worker } from "bullmq";
import IORedis from "ioredis";
import OpenAI from "openai";
import { eq, sql } from "drizzle-orm";
import { bookmarks, collections, bookmarkCollections, type Database } from "@stash/db";
import { fetchAndParse, sanitize } from "@stash/parser";
import { analyzeContent, generateEmbedding } from "@stash/ai";

export function initWorker(db: Database) {
  const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: null,
  });

  const worker = new Worker(
    "bookmark-processing",
    async (job) => {
      const { bookmarkId, url } = job.data as { bookmarkId: string; url: string };
      console.log(`Processing bookmark ${bookmarkId}: ${url}`);

      // Update status to processing
      await db
        .update(bookmarks)
        .set({ processing_status: "processing" })
        .where(eq(bookmarks.id, bookmarkId));

      try {
        // Step 1: Fetch and parse content
        await job.updateProgress(10);
        const parsed = await fetchAndParse(url);

        // Update with parsed content
        await db
          .update(bookmarks)
          .set({
            title: parsed.title,
            description: parsed.description,
            content: parsed.content,
            html_snapshot: parsed.html ? sanitize(parsed.html) : null,
            favicon_url: parsed.favicon_url,
            og_image_url: parsed.og_image_url,
            domain: parsed.domain,
            language: parsed.language,
            published_at: parsed.published_at ? new Date(parsed.published_at) : null,
            reading_time_min: parsed.reading_time_min,
            updated_at: new Date(),
          })
          .where(eq(bookmarks.id, bookmarkId));

        await job.updateProgress(40);

        // Track enriched data from LLM (used later for embedding)
        let summary: string | null = null;
        let enrichedTags: string[] = [];

        // Step 2: LLM analysis (if content available and API key present)
        if (parsed.content && process.env.OPENAI_API_KEY) {
          const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

          try {
            const analysis = await analyzeContent(
              openai,
              parsed.content,
              parsed.title,
              url,
            );

            // Merge LLM tags with any user-provided tags
            const existingBookmark = await db
              .select({ tags: bookmarks.tags })
              .from(bookmarks)
              .where(eq(bookmarks.id, bookmarkId))
              .limit(1);

            const existingTags = existingBookmark[0]?.tags ?? [];
            enrichedTags = [...new Set([...existingTags, ...analysis.tags])];
            summary = analysis.summary;

            await db
              .update(bookmarks)
              .set({
                summary: analysis.summary,
                category: analysis.category,
                tags: enrichedTags,
                updated_at: new Date(),
              })
              .where(eq(bookmarks.id, bookmarkId));

            // Auto-assign to collection based on category
            if (analysis.category && analysis.category !== "Other") {
              try {
                // Find or create the collection
                let collection = await db
                  .select({ id: collections.id })
                  .from(collections)
                  .where(eq(collections.name, analysis.category))
                  .limit(1);

                let collectionId: string;
                if (collection.length === 0) {
                  const [created] = await db
                    .insert(collections)
                    .values({ name: analysis.category })
                    .returning({ id: collections.id });
                  collectionId = created!.id;
                } else {
                  collectionId = collection[0]!.id;
                }

                // Add bookmark to collection (ignore if already exists)
                await db
                  .insert(bookmarkCollections)
                  .values({ bookmark_id: bookmarkId, collection_id: collectionId })
                  .onConflictDoNothing();
              } catch (err) {
                console.error(`Auto-collection failed for ${bookmarkId}:`, err);
              }
            }

            await job.updateProgress(70);
          } catch (err) {
            console.error(`LLM analysis failed for ${bookmarkId}:`, err);
            // Continue — bookmark still saved without summary/tags
          }

          // Step 3: Generate embedding AFTER LLM so we embed enriched content
          // Priority order: title > summary > tags > domain > description > content
          // (truncated to 8000 chars in generateEmbedding — most important signals first)
          try {
            const embeddingParts = [
              parsed.title,
              summary,
              enrichedTags.length > 0 ? enrichedTags.join(", ") : null,
              parsed.domain,
              parsed.description,
              parsed.content,
            ].filter(Boolean);

            const textToEmbed = embeddingParts.join(" — ");
            const embedding = await generateEmbedding(openai, textToEmbed);
            const vectorStr = `[${embedding.join(",")}]`;

            await db.execute(
              sql`UPDATE bookmarks SET embedding = ${vectorStr}::vector WHERE id = ${bookmarkId}`,
            );

            await job.updateProgress(90);
          } catch (err) {
            console.error(`Embedding generation failed for ${bookmarkId}:`, err);
          }
        }

        // Step 4: Build weighted search vector
        // A (highest weight): title, tags — the primary identifiers
        // B: summary, description — concise metadata
        // C: domain, url (tokenized) — source identity
        // D (lowest weight): full content — broad matching
        await db.execute(
          sql`UPDATE bookmarks SET search_vector =
              setweight(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(array_to_string(tags, ' '), '')), 'A') ||
              setweight(to_tsvector('english', coalesce(summary, '') || ' ' || coalesce(description, '')), 'B') ||
              setweight(to_tsvector('english', coalesce(domain, '') || ' ' || regexp_replace(coalesce(url, ''), '[/:._\\-]+', ' ', 'g')), 'C') ||
              setweight(to_tsvector('english', coalesce(content, '')), 'D')
            WHERE id = ${bookmarkId}`,
        );

        // Mark as completed
        await db
          .update(bookmarks)
          .set({ processing_status: "completed", updated_at: new Date() })
          .where(eq(bookmarks.id, bookmarkId));

        await job.updateProgress(100);
        console.log(`Bookmark ${bookmarkId} processed successfully`);
      } catch (err) {
        console.error(`Processing failed for bookmark ${bookmarkId}:`, err);
        await db
          .update(bookmarks)
          .set({ processing_status: "failed", updated_at: new Date() })
          .where(eq(bookmarks.id, bookmarkId));
        throw err;
      }
    },
    {
      connection,
      concurrency: 3,
    },
  );

  worker.on("failed", (job, err) => {
    console.error(`Job ${job?.id} failed:`, err.message);
  });

  console.log("BullMQ worker started");
  return worker;
}
