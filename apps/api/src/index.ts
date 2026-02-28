import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { createDb, runMigrations } from "@stash/db";
import { appRouter } from "./router/index.js";
import { createContext } from "./context.js";
import { createRestRouter } from "./rest.js";
import { initWorker } from "./worker.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const port = parseInt(process.env.PORT ?? "3000", 10);

// Database
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

async function main() {
  // Run migrations before starting the server
  await runMigrations(databaseUrl!);

  const db = createDb(databaseUrl!);

  // Init BullMQ worker
  initWorker(db);

  const app = express();

  // Middleware
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          "img-src": ["'self'", "data:", "https:", "http:"],
        },
      },
    }),
  );
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",")
    : ["http://localhost:5173", "http://localhost:3000"];
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. same-origin, curl, mobile apps)
        if (!origin) return callback(null, true);
        // Allow configured origins
        if (allowedOrigins.includes(origin)) return callback(null, true);
        // Allow Chrome extension origins
        if (origin.startsWith("chrome-extension://")) return callback(null, true);
        callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(cookieParser());

  // REST API v1 (for extension + third-party clients)
  app.use("/api/v1", createRestRouter(db));

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
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

export type { AppRouter } from "./router/index.js";
