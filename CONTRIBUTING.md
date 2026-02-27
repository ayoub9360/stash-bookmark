# Contributing to Stash

Thanks for your interest in contributing! This guide will help you get started.

## Development Setup

1. **Fork & clone** the repository
2. Install dependencies:

```bash
pnpm install
```

3. Start the infrastructure:

```bash
docker compose up postgres redis -d
```

4. Configure your environment:

```bash
cp .env.example .env
# Edit .env — point DATABASE_URL to localhost
```

5. Start development:

```bash
pnpm dev
```

This starts both the frontend (Vite on port 5173) and backend (Express on port 3000) in watch mode.

## Project Structure

The project is a monorepo managed by Turborepo + pnpm workspaces:

- `apps/web` — React frontend (Vite + TanStack Router)
- `apps/api` — Express backend (tRPC + BullMQ workers)
- `packages/db` — Database schema + migrations (Drizzle ORM)
- `packages/shared` — Shared types, Zod schemas, utils
- `packages/parser` — URL fetching + content parsing
- `packages/ai` — LLM summarization + embeddings
- `packages/search` — Hybrid search implementation

Build order is handled by Turborepo. Packages are built before apps automatically.

## Making Changes

### Workflow

1. Create a branch from `main`:
   ```bash
   git checkout -b feat/your-feature
   ```
2. Make your changes
3. Test locally (`pnpm dev`, verify in browser)
4. Run type checking:
   ```bash
   pnpm typecheck
   ```
5. Commit with a clear message (see below)
6. Open a pull request

### Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add bookmark import from Chrome
fix: search not returning results for short queries
docs: update API reference in README
refactor: extract metadata parsing into shared util
```

### Code Style

- TypeScript strict mode everywhere
- Use Zod for input validation on tRPC procedures
- Follow existing patterns — check similar files before creating new ones
- Keep imports organized: external deps first, then internal packages, then relative imports

### Database Changes

If you modify the schema in `packages/db/src/schema.ts`:

```bash
# Generate a migration
pnpm db:generate

# Apply it locally
pnpm db:push
```

Always include generated migration files in your PR.

### Adding UI Components

The frontend uses [shadcn/ui](https://ui.shadcn.com/) patterns with Tailwind CSS v4. Components live in `apps/web/src/components/ui/`. Follow the existing component structure.

## Pull Requests

- Keep PRs focused — one feature or fix per PR
- Add a clear description of what changed and why
- Make sure `pnpm typecheck` passes
- If you're adding a new feature, update the README if needed

## Reporting Issues

When opening an issue:

- Describe what you expected vs what happened
- Include steps to reproduce
- Mention your environment (OS, Node version, Docker version)
- Include relevant logs if applicable

## Questions?

Open a [discussion](https://github.com/ayoub9360/stash/discussions) or an issue. We're happy to help.
