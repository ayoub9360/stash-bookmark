# Stash — AI Bookmark Manager

An intelligent bookmark manager: paste a link, it does the rest. Content parsing, metadata extraction, auto-categorization, and natural language search via hybrid RAG.

## Quick Start (Docker)

```bash
cp .env.example .env
# Edit .env with your OpenAI API key and password
docker compose up
```

Open http://localhost:3000 and enter your password.

## Development

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL with pgvector extension
- Redis

### Setup

```bash
# Install dependencies
pnpm install

# Start PostgreSQL and Redis (via Docker)
docker compose up postgres redis -d

# Set up environment
cp .env.example .env
# Edit DATABASE_URL to point to localhost

# Push database schema
pnpm db:push

# Start development
pnpm dev
```

Frontend: http://localhost:5173
API: http://localhost:3000

## Architecture

```
ai-bookmark-manager/
├── apps/
│   ├── web/          # React (Vite) + shadcn/ui frontend
│   └── api/          # Express.js + tRPC backend
├── packages/
│   ├── db/           # Drizzle ORM + PostgreSQL schema
│   ├── shared/       # Shared types, utils, zod schemas
│   ├── parser/       # URL fetching + content parsing
│   ├── ai/           # LLM summarization + embeddings
│   └── search/       # Hybrid search (pgvector + tsvector)
├── docker-compose.yml
└── Dockerfile
```

## Bookmark Processing Pipeline

```
URL → Fetch HTML → Parse (Readability) → Extract Metadata →
LLM Summarize + Categorize + Tag → Generate Embedding → Store
```

Processing is async via BullMQ + Redis. If the LLM step fails, the bookmark is still saved with parsed content.

## Search

Hybrid search combining:
1. **Semantic search** — pgvector cosine similarity on OpenAI embeddings
2. **Keyword search** — PostgreSQL tsvector full-text search
3. **Reciprocal Rank Fusion** — merges both result sets

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind v4, shadcn/ui, TanStack Router + Query
- **Backend**: Express.js, tRPC, BullMQ
- **Database**: PostgreSQL + pgvector + Drizzle ORM
- **AI**: OpenAI (gpt-4o-mini, text-embedding-3-small)
- **Infra**: Docker Compose, Turborepo, pnpm workspaces

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PASSWORD` | Login password (mono-tenant) |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `OPENAI_API_KEY` | OpenAI API key for LLM + embeddings |
