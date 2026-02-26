# AI Bookmark Manager — Build Instructions

Read PRD.md for full context. Build this project from scratch.

## Stack & Architecture

**Monorepo** with Turborepo + pnpm workspaces:

```
ai-bookmark-manager/
├── apps/
│   ├── web/          # React (Vite) + shadcn/ui frontend
│   └── api/          # Express.js backend
├── packages/
│   ├── db/           # Drizzle ORM + PostgreSQL schema + migrations
│   ├── parser/       # URL fetching + content parsing (Readability + Cheerio)
│   ├── ai/           # LLM summarization/categorization + embeddings (OpenAI)
│   ├── search/       # Hybrid search (pgvector + tsvector)
│   └── shared/       # Shared types, utils, zod schemas
├── docker-compose.yml
├── Dockerfile
├── turbo.json
└── package.json
```

## Key Requirements

1. **Monorepo**: Turborepo, pnpm workspaces
2. **Frontend**: React 19 + Vite + shadcn/ui + Tailwind v4 + TanStack Query + TanStack Router (file-based routing)
3. **Backend**: Express.js + tRPC (express adapter) — type-safe API
4. **Database**: PostgreSQL with pgvector extension + Drizzle ORM
5. **Queue**: BullMQ + Redis for async bookmark processing pipeline
6. **Auth**: NO auth system. Simple `.env` PASSWORD for mono-tenant. Middleware checks `Authorization: Bearer <PASSWORD>` header. Frontend stores password in localStorage after login prompt.
7. **Docker Compose**: PostgreSQL (pgvector/pgvector:pg17), Redis, app (multi-stage build). One `docker compose up` to run everything.

## Bookmark Pipeline (BullMQ workers in api/)

```
URL added → Job created → fetch HTML → parse with Readability → extract metadata (title, description, favicon, OG tags, domain, language, reading time) → LLM summarize + categorize + auto-tag → generate embedding → store in PostgreSQL
```

- Each step retries independently
- If LLM fails, bookmark still saved (just without summary/tags)
- LLM provider: OpenAI (gpt-4o-mini for summary/categorize, text-embedding-3-small for vectors)

## Database Schema (Drizzle + pgvector)

Core tables:
- `bookmarks` — url, title, description, summary (LLM), content (parsed text), html_snapshot, favicon_url, og_image_url, domain, language, published_at, reading_time_min, category, tags (text[]), is_favorite, is_archived, is_read, embedding (vector 1536), search_vector (tsvector), created_at, updated_at
- `categories` — name, icon, parent_id (self-ref tree)
- `collections` — name, description
- `bookmark_collections` — M2M

No users table. Single tenant.

## Search (packages/search/)

Hybrid search combining:
1. **Semantic**: pgvector cosine similarity on embeddings
2. **Keyword**: PostgreSQL tsvector full-text search
3. **Reciprocal Rank Fusion** to merge results

The search endpoint should detect if a query looks like natural language vs simple keyword.

## Frontend Pages

1. **Login** — simple password input, stores in localStorage
2. **Dashboard** — recent bookmarks, stats
3. **Bookmarks list** — grid/list view toggle, filters sidebar (category, tags, domain, date, status), search bar (auto-detects filter vs natural language)
4. **Bookmark detail** — reader mode (parsed content), metadata, edit tags/category
5. **Add bookmark** — URL input, optional manual tags
6. **Collections** — group bookmarks manually

Use shadcn/ui components: Card, Input, Button, Dialog, Select, Badge, Tabs, Skeleton loading states.
Dark mode by default (light available).

## Docker Compose

```yaml
services:
  app:
    build: .
    ports: ["3000:3000"]  # Frontend
    env_file: .env
    depends_on: [postgres, redis]
  postgres:
    image: pgvector/pgvector:pg17
    volumes: ["pgdata:/var/lib/postgresql/data"]
    environment:
      POSTGRES_DB: bookmarks
      POSTGRES_USER: bookmarks
      POSTGRES_PASSWORD: bookmarks
  redis:
    image: redis:7-alpine
    volumes: ["redisdata:/data"]
volumes:
  pgdata:
  redisdata:
```

## .env Example

```
PASSWORD=mysecretpassword
DATABASE_URL=postgresql://bookmarks:bookmarks@postgres:5432/bookmarks
REDIS_URL=redis://redis:6379
OPENAI_API_KEY=sk-...
```

## Important

- Use `pnpm` everywhere
- All packages should be properly typed with TypeScript strict mode
- tRPC routers in api/ with proper input validation (zod)
- Make sure `turbo.json` has proper build pipeline (db build first, then shared, then others)
- Frontend proxies API calls to backend in dev via Vite proxy
- In production Docker, Express serves both API (/api/*) and static frontend files
- Include a proper README.md with setup instructions

Build everything. Make it work. Make it clean.
