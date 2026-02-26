# PRD — Open Source Bookmark Manager (Codename: **Stash**)

## Vision

Un bookmark manager intelligent : tu colles un lien, il fait le reste. Parsing du contenu, extraction des métadonnées, catégorisation auto, et recherche en langage naturel via RAG. Open source, self-hostable, rapide.

---

## Problème

Les bookmark managers existants sont soit :
- **Basiques** (navigateur) — pas de recherche, pas de catégorisation, 500 bookmarks en vrac
- **Fermés** (Raindrop, Pocket) — tes données chez eux, features limitées sans premium
- **Trop techniques** (Wallabag, Linkding) — stockent le contenu mais zéro intelligence

Personne ne fait : **ajouter un lien → comprendre le contenu → retrouver en langage naturel**.

---

## Utilisateurs cibles

1. **Développeurs / tech leads** — veille technique, articles, docs, repos GitHub
2. **Chercheurs / étudiants** — papers, articles, références
3. **Knowledge workers** — tout le monde qui bookmark 200 trucs et n'en retrouve jamais aucun

---

## Core Features

### 1. Ajout de bookmark
- Coller une URL → le système fait tout
- Extension navigateur (Chrome/Firefox) — un clic
- API publique pour intégrations
- Import depuis navigateurs (Chrome, Firefox, Safari) et services (Pocket, Raindrop, Pinboard)

### 2. Pipeline d'analyse (automatique à l'ajout)

```
URL → Fetch → Parse → Extract → Categorize → Embed → Store
```

| Étape | Détail |
|-------|--------|
| **Fetch** | Récupération HTML (+ JS rendering si SPA via headless browser) |
| **Parse** | Extraction contenu principal (titre, auteur, date publication, langue, temps de lecture) via Readability/Mozilla algorithm |
| **Extract metadata** | Favicon, OG tags, description, images clés, domaine, tech stack (optionnel) |
| **Summarize** | Résumé auto du contenu (LLM) — 2-3 phrases |
| **Categorize** | Catégorisation auto par le LLM (tags + catégorie principale) basée sur un arbre de catégories configurable |
| **Embed** | Vectorisation du contenu full-text pour recherche sémantique |
| **Store** | Sauvegarde contenu, metadata, vecteurs, snapshot HTML |

### 3. Organisation

- **Catégories auto** — assignées par le LLM, modifiables par l'utilisateur
- **Tags auto** — extraits du contenu, éditables
- **Collections manuelles** — dossiers créés par l'utilisateur
- **Favoris** — épingler les plus importants
- **Archive** — marquer comme lu/archivé

### 4. Recherche

#### Filtres classiques
- Par catégorie, tags, collection
- Par date d'ajout / date de publication
- Par domaine / source
- Par langue
- Par statut (lu, non lu, favori, archivé)
- Full-text search sur titre + description

#### Recherche langage naturel (RAG)
- "Articles sur les design patterns en React publiés cette année"
- "Ce tuto que j'ai sauvé sur les migrations PostgreSQL"
- "Comparatifs de frameworks CSS récents"
- Utilise les embeddings du contenu parsé
- Hybrid search : vecteurs (sémantique) + BM25 (keyword) → reranking
- Affiche le passage pertinent en highlight dans les résultats

### 5. Interface

- **Dashboard** — bookmarks récents, stats, suggestions "redécouvrir"
- **Liste / Grille** — vue des bookmarks avec preview (titre, résumé, favicon, tags)
- **Détail bookmark** — contenu parsé lisible (mode reader), metadata, tags, catégorie
- **Search bar** — omnibar : tape du texte → détecte auto si filtre ou langage naturel
- **Dark mode** par défaut (clair dispo)
- **Responsive** — mobile-first

---

## Architecture technique

### Stack

| Composant | Choix | Justification |
|-----------|-------|---------------|
| **Frontend** | Next.js 15 (App Router) | SSR, RSC, écosystème, DX |
| **Backend** | Next.js API Routes + tRPC | Type-safe, monorepo simple |
| **DB** | PostgreSQL | Robuste, extensible, pg_vector |
| **Vector store** | pgvector (extension PG) | Pas de service externe, tout dans PG |
| **Full-text search** | PostgreSQL FTS (tsvector) | BM25-like ranking natif, pas besoin d'Elastic |
| **Queue** | BullMQ + Redis | Pipeline d'analyse async |
| **ORM** | Drizzle | Type-safe, léger, migrations clean |
| **Embeddings** | OpenAI `text-embedding-3-small` (défaut) | Bon ratio qualité/coût. Pluggable : support Ollama/local |
| **LLM (catégorisation/résumé)** | OpenAI GPT-4o-mini (défaut) | Rapide, pas cher. Pluggable : Ollama, Anthropic, etc. |
| **HTML parsing** | Mozilla Readability + Cheerio | Standard de l'industrie |
| **JS rendering** | Playwright (optionnel, pour SPAs) | Headless Chromium |
| **Auth** | Better Auth | Open source, self-hosted, simple |
| **Styling** | Tailwind + shadcn/ui | Standard, rapide |
| **Monorepo** | pnpm workspace | Un seul repo |

### Architecture simplifiée

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Frontend    │────▶│  API (tRPC)  │────▶│  PostgreSQL      │
│  Next.js     │     │              │     │  + pgvector      │
└─────────────┘     └──────┬───────┘     │  + tsvector      │
                           │              └─────────────────┘
                           │
┌─────────────┐     ┌──────▼───────┐     ┌─────────────────┐
│  Extension   │────▶│  BullMQ      │────▶│  Redis           │
│  Browser     │     │  Workers     │     │                  │
└─────────────┘     └──────────────┘     └─────────────────┘
                           │
                    ┌──────▼───────┐
                    │  LLM / Embed │
                    │  (pluggable) │
                    └──────────────┘
```

### Schéma DB (core)

```sql
-- Bookmarks
CREATE TABLE bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  summary TEXT,              -- LLM-generated
  content TEXT,              -- Parsed full text (reader mode)
  html_snapshot TEXT,        -- Raw HTML backup
  favicon_url TEXT,
  og_image_url TEXT,
  domain TEXT,
  language VARCHAR(10),
  published_at TIMESTAMPTZ,
  reading_time_min INT,
  category_id UUID REFERENCES categories(id),
  is_favorite BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  is_read BOOLEAN DEFAULT false,
  embedding vector(1536),    -- pgvector
  search_vector tsvector,    -- PG full-text search
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, url)
);

-- Index vector pour recherche sémantique
CREATE INDEX ON bookmarks USING ivfflat (embedding vector_cosine_ops);

-- Index full-text
CREATE INDEX ON bookmarks USING gin (search_vector);

-- Categories (arbre)
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES categories(id),
  icon TEXT,
  sort_order INT DEFAULT 0
);

-- Tags
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  UNIQUE(user_id, name)
);

-- Bookmark <-> Tags (M2M)
CREATE TABLE bookmark_tags (
  bookmark_id UUID REFERENCES bookmarks(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  auto_generated BOOLEAN DEFAULT false,
  PRIMARY KEY (bookmark_id, tag_id)
);

-- Collections (manuelles)
CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE bookmark_collections (
  bookmark_id UUID REFERENCES bookmarks(id) ON DELETE CASCADE,
  collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
  PRIMARY KEY (bookmark_id, collection_id)
);
```

### Pipeline d'analyse (BullMQ)

```
Job: process-bookmark
├── Step 1: fetch-content     (HTTP GET + fallback Playwright)
├── Step 2: parse-content     (Readability → texte + metadata)
├── Step 3: extract-metadata  (OG tags, favicon, domain, langue)
├── Step 4: llm-analyze       (résumé + catégorisation + tags)
├── Step 5: generate-embedding (contenu → vecteur 1536d)
└── Step 6: update-bookmark   (tout sauvegarder en DB)
```

Chaque step est retry-able indépendamment. Si le LLM fail, le bookmark est sauvé quand même (juste sans résumé/catégorie auto).

### Recherche hybride (RAG)

```typescript
async function hybridSearch(query: string, userId: string) {
  // 1. Embed la query
  const queryEmbedding = await embed(query);
  
  // 2. Recherche sémantique (pgvector)
  const semanticResults = await db.execute(sql`
    SELECT id, 1 - (embedding <=> ${queryEmbedding}) as semantic_score
    FROM bookmarks
    WHERE user_id = ${userId}
    ORDER BY embedding <=> ${queryEmbedding}
    LIMIT 50
  `);
  
  // 3. Recherche keyword (tsvector)
  const keywordResults = await db.execute(sql`
    SELECT id, ts_rank(search_vector, plainto_tsquery(${query})) as keyword_score
    FROM bookmarks
    WHERE user_id = ${userId}
      AND search_vector @@ plainto_tsquery(${query})
    LIMIT 50
  `);
  
  // 4. Reciprocal Rank Fusion (RRF)
  return fuseResults(semanticResults, keywordResults, { k: 60 });
}
```

---

## Sécurité (open source context)

- **Auth** — sessions côté serveur (Better Auth), pas de JWT dans le client
- **Rate limiting** — sur l'API et sur le pipeline (pas de spam de bookmarks)
- **Content sanitization** — le HTML parsé est sanitizé (DOMPurify) avant stockage/affichage
- **API keys** — les clés LLM/embedding sont côté serveur uniquement, jamais exposées au client
- **CORS** — restrictif, origin whitelist
- **Input validation** — Zod sur tous les inputs tRPC
- **Self-hosted first** — Docker Compose one-click, toutes les données restent chez l'utilisateur
- **No telemetry** — zéro tracking, zéro analytics côté serveur par défaut
- **Encryption at rest** — option pour chiffrer le contenu des bookmarks en DB (AES-256)

---

## Déploiement

### Self-hosted (priorité)
```yaml
# docker-compose.yml
services:
  app:
    image: stash:latest
    ports: ["3000:3000"]
    env_file: .env
  postgres:
    image: pgvector/pgvector:pg17
    volumes: ["./data/pg:/var/lib/postgresql/data"]
  redis:
    image: redis:7-alpine
    volumes: ["./data/redis:/data"]
```

Un `docker compose up` et c'est parti.

### Cloud (later)
- Hosted version possible (SaaS freemium) mais pas la priorité
- Coolify-compatible

---

## MVP (v0.1) — Scope

| Feature | Inclus |
|---------|--------|
| Ajouter un bookmark via URL | ✅ |
| Pipeline: fetch + parse + metadata | ✅ |
| Pipeline: résumé + catégorisation LLM | ✅ |
| Pipeline: embedding | ✅ |
| Liste des bookmarks (grille/liste) | ✅ |
| Filtres : catégorie, tags, date, domaine | ✅ |
| Recherche langage naturel (hybrid) | ✅ |
| Reader mode (contenu parsé) | ✅ |
| Auth (login/register) | ✅ |
| Dark mode | ✅ |
| Docker Compose | ✅ |
| Extension navigateur | ❌ v0.2 |
| Import depuis services | ❌ v0.2 |
| Collections | ❌ v0.2 |
| Sharing / collections publiques | ❌ v0.3 |
| Mobile app | ❌ v0.4 |

---

## Structure du projet

```
stash/
├── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
├── apps/
│   └── web/                    # Next.js app
│       ├── src/
│       │   ├── app/            # App Router pages
│       │   ├── components/     # UI components
│       │   ├── server/         # tRPC routers
│       │   └── lib/            # Utils, types
│       └── ...
├── packages/
│   ├── db/                     # Drizzle schema + migrations
│   ├── queue/                  # BullMQ workers + jobs
│   ├── parser/                 # Content fetching + parsing
│   ├── ai/                     # LLM + embedding (pluggable)
│   └── search/                 # Hybrid search logic
└── docker/
    └── Dockerfile
```

---

## Success Metrics

- **Time to value** : < 5 min entre `docker compose up` et premier bookmark analysé
- **Parsing success rate** : > 95% des URLs correctement parsées
- **Search relevance** : l'utilisateur trouve son bookmark dans les 3 premiers résultats en langage naturel
- **GitHub stars** : objectif 500 en 3 mois (si marketing open source actif)

---

## Risques

| Risque | Mitigation |
|--------|------------|
| Coût embeddings/LLM pour gros volumes | Support Ollama/local models dès le MVP. Batch processing. |
| SPAs mal parsées | Fallback Playwright (optionnel, pas requis) |
| Qualité catégorisation LLM | Arbre de catégories configurable + override manuel |
| Adoption open source | README soigné, démo live, screenshots/vidéo |

---

## Nom

**Stash** — court, mémorisable, évoque le stockage. `stash.sh` ? `getstash.dev` ? À vérifier dispo.
