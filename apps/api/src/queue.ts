import { Queue } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export const bookmarkQueue = new Queue("bookmark-processing", { connection });

export async function addBookmarkJob(bookmarkId: string, url: string) {
  await bookmarkQueue.add(
    "process-bookmark",
    { bookmarkId, url },
    {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
    },
  );
}
