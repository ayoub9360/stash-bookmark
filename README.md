# Stash — AI Bookmark Manager

An intelligent, self-hosted bookmark manager. Paste a link, it does the rest: content parsing, metadata extraction, LLM-powered summarization & categorization, and natural language search via hybrid RAG.

**No accounts. No tracking. Your data stays on your machine.**

![Dashboard](assets/screen-homepage.png)

![Bookmarks](assets/screen-bookmarks.png)

## Features

- **Automatic analysis** — Paste a URL and Stash fetches the content, extracts metadata (title, favicon, OG image, reading time, language), summarizes it with an LLM, auto-assigns categories & tags, and generates a vector embedding for semantic search.
- **Hybrid search** — Combines pgvector cosine similarity (semantic) + PostgreSQL tsvector (keyword) with Reciprocal Rank Fusion. Search in natural language or with keywords — it handles both.
- **Reader mode** — Parsed article content displayed in a clean, readable format.
- **Organization** — Categories (auto or manual), tags, favorites, archive, read/unread status.
- **Dark mode** — Dark by default, light mode available.
- **Single-tenant** — No user system. One password in `.env`, one instance, full control.
- **Self-hosted** — One `docker compose up` and you're running.

## Quick Start

```bash
git clone https://github.com/ayoub9360/stash.git
cd stash
cp .env.example .env
```

Edit `.env` with your settings:

```env
PASSWORD=your-secret-password
OPENAI_API_KEY=sk-your-openai-key
REDIS_PASSWORD=your-redis-password
```

Then:

```bash
docker compose up
```

Open [http://localhost:3000](http://localhost:3000) and enter your password.

## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 9+
- [Docker](https://www.docker.com/) (for PostgreSQL + Redis)

### Setup

```bash
# Install dependencies
pnpm install

# Start PostgreSQL (with pgvector) and Redis
docker compose up postgres redis -d

# Configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL to localhost:
#   DATABASE_URL=postgresql://bookmarks:bookmarks@localhost:5432/bookmarks

# Push database schema
pnpm db:push

# Start dev servers (frontend + backend)
pnpm dev
```

- Frontend: [http://localhost:5173](http://localhost:5173)
- API: [http://localhost:3000](http://localhost:3000)

## Architecture

```
stash/
├── apps/
│   ├── web/            React 19 + Vite + shadcn/ui + TanStack Router
│   └── api/            Express.js + tRPC + BullMQ workers
├── packages/
│   ├── db/             Drizzle ORM + PostgreSQL schema + migrations
│   ├── shared/         Shared types, Zod schemas, utils
│   ├── parser/         URL fetching + content parsing (Readability + Cheerio)
│   ├── ai/             LLM summarization/categorization + embeddings (OpenAI)
│   └── search/         Hybrid search (pgvector + tsvector + RRF)
├── docker-compose.yml  PostgreSQL + Redis + app
├── Dockerfile          Multi-stage production build
└── turbo.json          Turborepo pipeline config
```

### Bookmark Processing Pipeline

When you add a URL, an async BullMQ job processes it through this pipeline:

```
URL added
  → Fetch HTML
  → Parse with Mozilla Readability
  → Extract metadata (title, description, favicon, OG tags, domain, language, reading time)
  → LLM: summarize + categorize + auto-tag (gpt-4o-mini)
  → Generate vector embedding (text-embedding-3-small)
  → Store everything in PostgreSQL
```

Each step retries independently. If the LLM fails (rate limit, API down), the bookmark is still saved with its parsed content — the AI analysis just won't be available.

### Hybrid Search

Search combines two strategies and merges them with Reciprocal Rank Fusion:

1. **Semantic search** — The query is embedded and compared against bookmark embeddings using pgvector cosine similarity.
2. **Keyword search** — PostgreSQL full-text search using tsvector/tsquery.
3. **RRF merge** — Both result sets are fused to produce a final ranked list.

The search bar auto-detects whether you're typing a natural language query or a simple keyword filter.

## Tech Stack

| Layer      | Technology                                                             |
| ---------- | ---------------------------------------------------------------------- |
| Frontend   | React 19, Vite 6, Tailwind CSS v4, shadcn/ui, TanStack Router + Query  |
| Backend    | Express.js, tRPC (type-safe API)                                       |
| Database   | PostgreSQL 17 + pgvector + Drizzle ORM                                 |
| Queue      | BullMQ + Redis                                                         |
| AI         | OpenAI — gpt-4o-mini (summarization), text-embedding-3-small (vectors) |
| Monorepo   | Turborepo + pnpm workspaces                                            |
| Deployment | Docker Compose (multi-stage build)                                     |

## Environment Variables

| Variable           | Required | Description                                                  |
| ------------------ | -------- | ------------------------------------------------------------ |
| `PASSWORD`         | Yes      | Login password (min 8 chars)                                 |
| `OPENAI_API_KEY`   | Yes      | OpenAI API key for LLM + embeddings                         |
| `REDIS_PASSWORD`   | No       | Redis password (default: `changeme`)                         |
| `POSTGRES_PASSWORD`| No       | PostgreSQL password (default: `bookmarks`)                   |
| `ALLOWED_ORIGINS`  | No       | Comma-separated CORS origins (default: `localhost:5173,3000`)|
| `TRUST_PROXY`      | No       | Set to `1` if behind a reverse proxy (for rate limiting)     |
| `SESSION_SECRET`   | No       | Secret for session token HMAC (defaults to `PASSWORD`)       |
| `PORT`             | No       | Server port (default: `3000`)                                |

## API

The API uses [tRPC](https://trpc.io/) and is fully type-safe. All endpoints are under `/api/trpc`.

Key procedures:

| Procedure         | Type     | Description                                                        |
| ----------------- | -------- | ------------------------------------------------------------------ |
| `bookmark.list`   | query    | List bookmarks with filters (category, tags, status, domain, date) |
| `bookmark.get`    | query    | Get a single bookmark with full content                            |
| `bookmark.create` | mutation | Add a new bookmark by URL                                          |
| `bookmark.update` | mutation | Update bookmark metadata (tags, category, favorite, read, archive) |
| `bookmark.delete` | mutation | Delete a bookmark                                                  |
| `bookmark.search` | query    | Hybrid search (semantic + keyword)                                 |

Authentication: session is managed via httpOnly cookie (set on login). The API also accepts `Authorization: Bearer <PASSWORD>` header as fallback.

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a PR.

## License

[MIT](LICENSE)
