import { Worker } from "bullmq";
import IORedis from "ioredis";
import OpenAI from "openai";
import { eq, sql } from "drizzle-orm";
import { bookmarks, type Database } from "@stash/db";
import { fetchAndParse } from "@stash/parser";
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
            html_snapshot: parsed.html,
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
            const mergedTags = [...new Set([...existingTags, ...analysis.tags])];

            await db
              .update(bookmarks)
              .set({
                summary: analysis.summary,
                category: analysis.category,
                tags: mergedTags,
                updated_at: new Date(),
              })
              .where(eq(bookmarks.id, bookmarkId));

            await job.updateProgress(70);
          } catch (err) {
            console.error(`LLM analysis failed for ${bookmarkId}:`, err);
            // Continue — bookmark still saved without summary/tags
          }

          // Step 3: Generate embedding
          try {
            const textToEmbed = `${parsed.title ?? ""} ${parsed.description ?? ""} ${parsed.content}`;
            const embedding = await generateEmbedding(openai, textToEmbed);
            const vectorStr = `[${embedding.join(",")}]`;

            await db.execute(
              sql`UPDATE bookmarks SET embedding = ${sql.raw(`'${vectorStr}'::vector`)} WHERE id = ${bookmarkId}`,
            );

            await job.updateProgress(90);
          } catch (err) {
            console.error(`Embedding generation failed for ${bookmarkId}:`, err);
          }
        }

        // Update search vector
        await db.execute(
          sql`UPDATE bookmarks SET search_vector = to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(content, '')) WHERE id = ${bookmarkId}`,
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
