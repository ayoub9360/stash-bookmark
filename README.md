# Stash — AI Bookmark Manager

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-ready-blue.svg)](Dockerfile)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)](tsconfig.json)

A self-hosted bookmark manager that uses AI to do the work for you. Paste a link — Stash fetches the content, summarizes it, categorizes it, tags it, and makes it searchable in natural language.

**No accounts. No tracking. Your data stays on your machine.**

![Dashboard](assets/screen-homepage.png)

![Bookmarks](assets/screen-bookmarks.png)

## Features

- **AI-powered processing** — Paste a URL and Stash fetches the content, extracts metadata (title, favicon, OG image, reading time, language), generates an LLM summary, auto-assigns a category and tags, and creates a vector embedding for search.
- **Hybrid search** — Combines pgvector cosine similarity (semantic) with PostgreSQL tsvector (keyword) using Reciprocal Rank Fusion. Search "that article about database scaling" or just "postgres" — both work.
- **Collections** — Group bookmarks into named collections for manual curation alongside auto-categorization.
- **Filters** — Filter by favorites, tags, domain, or date range (presets + custom range). Active filters are shown as removable badges.
- **Reader mode** — Parsed article content in a clean, distraction-free view.
- **Grid & list views** — Toggle between card grid and compact list layout.
- **Organization** — Categories (auto or manual), tags, favorites, archive, read/unread status.
- **Dark mode** — Dark by default, light mode available.
- **Single-tenant** — No user system. One password, one instance, full control.
- **Self-hosted** — One `docker compose up` and you're running.

## Quick Start

```bash
git clone https://github.com/ayoub9360/stash.git
cd stash
cp .env.example .env
```

Edit `.env`:

```env
PASSWORD=your-secret-password       # min 8 characters
OPENAI_API_KEY=sk-your-openai-key   # required for AI features
REDIS_PASSWORD=your-redis-password
```

```bash
docker compose up
```

Open [http://localhost:3000](http://localhost:3000) and enter your password.

## How It Works

### Bookmark Processing Pipeline

When you add a URL, an async BullMQ job processes it:

```
URL added
  → Fetch HTML
  → Parse with Mozilla Readability
  → Extract metadata (title, description, favicon, OG tags, domain, language, reading time)
  → LLM: summarize + categorize + auto-tag (gpt-4o-mini)
  → Generate vector embedding (text-embedding-3-small)
  → Store in PostgreSQL
```

Each step retries independently. If the LLM fails (rate limit, API down), the bookmark is still saved with its parsed content — AI analysis runs when the API is back.

### Hybrid Search

Search combines two strategies merged with Reciprocal Rank Fusion:

1. **Semantic** — Query is embedded and compared against bookmark vectors via pgvector cosine similarity
2. **Keyword** — PostgreSQL full-text search using tsvector/tsquery
3. **RRF merge** — Both result sets are fused into a final ranked list

## Architecture

```
stash/
├── apps/
│   ├── web/            React 19 + Vite + shadcn/ui + TanStack Router
│   └── api/            Express.js + tRPC + BullMQ workers
├── packages/
│   ├── db/             Drizzle ORM + PostgreSQL schema
│   ├── shared/         Shared types, Zod schemas, utils
│   ├── parser/         URL fetching + content parsing (Readability + Cheerio)
│   ├── ai/             LLM summarization/categorization + embeddings (OpenAI)
│   └── search/         Hybrid search (pgvector + tsvector + RRF)
├── docker-compose.yml  PostgreSQL + Redis + app
├── Dockerfile          Multi-stage production build
└── turbo.json          Turborepo pipeline config
```

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite 6, Tailwind CSS v4, shadcn/ui, TanStack Router + Query |
| Backend | Express.js, tRPC (type-safe API) |
| Database | PostgreSQL 17 + pgvector + Drizzle ORM |
| Queue | BullMQ + Redis |
| AI | OpenAI — gpt-4o-mini (summarization), text-embedding-3-small (vectors) |
| Monorepo | Turborepo + pnpm workspaces |
| Deployment | Docker Compose (multi-stage build) |

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 9+
- [Docker](https://www.docker.com/) (for PostgreSQL + Redis)

### Setup

```bash
pnpm install

# Start PostgreSQL (with pgvector) and Redis
docker compose up postgres redis -d

# Configure environment
cp .env.example .env
# Set DATABASE_URL=postgresql://bookmarks:bookmarks@localhost:5432/bookmarks

# Push database schema
pnpm db:push

# Start dev servers
pnpm dev
```

- Frontend: [http://localhost:5173](http://localhost:5173)
- API: [http://localhost:3000](http://localhost:3000)

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `PASSWORD` | Yes | Login password (min 8 chars) |
| `OPENAI_API_KEY` | Yes | OpenAI API key for LLM + embeddings |
| `REDIS_PASSWORD` | No | Redis password (default: `changeme`) |
| `POSTGRES_PASSWORD` | No | PostgreSQL password (default: `bookmarks`) |
| `ALLOWED_ORIGINS` | No | Comma-separated CORS origins (default: `localhost:5173,3000`) |
| `TRUST_PROXY` | No | Set to `1` if behind a reverse proxy |
| `SESSION_SECRET` | No | Secret for session token HMAC (defaults to `PASSWORD`) |
| `PORT` | No | Server port (default: `3000`) |

## API

The API uses [tRPC](https://trpc.io/) — fully type-safe. All endpoints are under `/api/trpc`.

| Procedure | Type | Description |
| --- | --- | --- |
| `bookmark.list` | query | List bookmarks with filters (category, tags, status, domain, date) |
| `bookmark.get` | query | Get a single bookmark with full content |
| `bookmark.create` | mutation | Add a new bookmark by URL |
| `bookmark.update` | mutation | Update bookmark metadata |
| `bookmark.delete` | mutation | Delete a bookmark |
| `bookmark.search` | query | Hybrid search (semantic + keyword) |
| `collection.list` | query | List all collections |
| `collection.get` | query | Get a collection with its bookmarks |
| `collection.create` | mutation | Create a new collection |
| `collection.addBookmark` | mutation | Add a bookmark to a collection |

Authentication: httpOnly session cookie (set on login). Also accepts `Authorization: Bearer <PASSWORD>` header as fallback.

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a PR.

## License

[MIT](LICENSE)
