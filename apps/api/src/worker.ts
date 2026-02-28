import { Worker } from "bullmq";
import IORedis from "ioredis";
import OpenAI from "openai";
import { eq, sql } from "drizzle-orm";
import { bookmarks, collections, bookmarkCollections, type Database } from "@stash/db";
import { fetchAndParse, sanitize } from "@stash/parser";
import { analyzeContent, generateEmbedding } from "@stash/ai";

interface JobData {
  bookmarkId: string;
  url: string;
  hasContent?: boolean;
}

export function initWorker(db: Database) {
  const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: null,
  });

  const worker = new Worker(
    "bookmark-processing",
    async (job) => {
      const { bookmarkId, url, hasContent } = job.data as JobData;
      console.log(`Processing bookmark ${bookmarkId}: ${url} (hasContent: ${!!hasContent})`);

      // Update status to processing
      await db
        .update(bookmarks)
        .set({ processing_status: "processing" })
        .where(eq(bookmarks.id, bookmarkId));

      try {
        let title: string | null = null;
        let description: string | null = null;
        let content: string | null = null;
        let domain: string | null = null;

        if (hasContent) {
          // Content was provided by the extension — skip fetch, read from DB
          await job.updateProgress(10);
          const existing = await db
            .select({
              title: bookmarks.title,
              description: bookmarks.description,
              content: bookmarks.content,
              domain: bookmarks.domain,
            })
            .from(bookmarks)
            .where(eq(bookmarks.id, bookmarkId))
            .limit(1);

          if (existing[0]) {
            title = existing[0].title;
            description = existing[0].description;
            content = existing[0].content;
            domain = existing[0].domain;
          }
          await job.updateProgress(40);
        } else {
          // Fetch and parse content server-side (existing flow)
          await job.updateProgress(10);
          const parsed = await fetchAndParse(url);

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

          title = parsed.title;
          description = parsed.description;
          content = parsed.content;
          domain = parsed.domain;
          await job.updateProgress(40);
        }

        // Track enriched data from LLM (used later for embedding)
        let summary: string | null = null;
        let enrichedTags: string[] = [];

        // Step 2: LLM analysis (if content available and API key present)
        if (content && process.env.OPENAI_API_KEY) {
          const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

          try {
            const analysis = await analyzeContent(
              openai,
              content,
              title,
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
          try {
            const embeddingParts = [
              title,
              summary,
              enrichedTags.length > 0 ? enrichedTags.join(", ") : null,
              domain,
              description,
              content,
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
        await db.execute(
          sql`UPDATE bookmarks SET search_vector =
              setweight(to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(array_to_string(tags, ' '), '')), 'A') ||
              setweight(to_tsvector('simple', coalesce(summary, '') || ' ' || coalesce(description, '')), 'B') ||
              setweight(to_tsvector('simple', coalesce(domain, '') || ' ' || regexp_replace(coalesce(url, ''), '[/:._\\-]+', ' ', 'g')), 'C') ||
              setweight(to_tsvector('simple', coalesce(content, '')), 'D')
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
