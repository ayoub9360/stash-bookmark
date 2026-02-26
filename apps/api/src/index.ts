import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { createDb } from "@stash/db";
import { appRouter } from "./router/index.js";
import { createContext } from "./context.js";
import { initWorker } from "./worker.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const port = parseInt(process.env.PORT ?? "3000", 10);

// Database
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}
const db = createDb(databaseUrl);

// Init BullMQ worker
initWorker(db);

// Middleware
app.use(cors());
app.use(express.json());

// tRPC
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext: (opts) => createContext(opts, db),
  }),
);

// In production, serve static frontend files
if (process.env.NODE_ENV === "production") {
  const webDist = path.resolve(__dirname, "../../web/dist");
  app.use(express.static(webDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(webDist, "index.html"));
  });
}

app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${port}`);
});

export type { AppRouter } from "./router/index.js";
