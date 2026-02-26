import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Grid, List, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { BookmarkCard } from "@/components/bookmark-card";
import { trpc } from "@/lib/trpc";
import { Link } from "@tanstack/react-router";

interface BookmarksSearch {
  q?: string;
}

export const Route = createFileRoute("/bookmarks/")({
  component: BookmarksPage,
  validateSearch: (search: Record<string, unknown>): BookmarksSearch => ({
    q: typeof search.q === "string" ? search.q : undefined,
  }),
});

function BookmarksPage() {
  const { q } = Route.useSearch();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState(q ?? "");
  const [filters, setFilters] = useState({
    category: undefined as string | undefined,
    is_favorite: undefined as boolean | undefined,
    is_archived: undefined as boolean | undefined,
    is_read: undefined as boolean | undefined,
  });

  const bookmarksQuery = trpc.bookmark.list.useQuery({
    ...filters,
    limit: 50,
    offset: 0,
    sort_by: "created_at",
    sort_order: "desc",
  });

  const searchResults = trpc.search.query.useQuery(
    { query: searchQuery, limit: 50, offset: 0 },
    { enabled: searchQuery.length > 0 },
  );

  const isSearching = searchQuery.length > 0;
  const data = isSearching ? searchResults.data : bookmarksQuery.data;
  const isLoading = isSearching ? searchResults.isLoading : bookmarksQuery.isLoading;
  const items = isSearching
    ? (searchResults.data?.results.map((r) => r.bookmark) ?? [])
    : (bookmarksQuery.data?.items ?? []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Bookmarks</h1>
        <Link to="/add">
          <Button>
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </Link>
      </div>

      {/* Search & filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Input
            placeholder="Search bookmarks... (natural language or keywords)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border p-1">
          <Button
            variant={view === "grid" ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={() => setView("grid")}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={view === "list" ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={() => setView("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filters.is_favorite ? "default" : "outline"}
          size="sm"
          onClick={() => setFilters((f) => ({ ...f, is_favorite: f.is_favorite ? undefined : true }))}
        >
          Favorites
        </Button>
        <Button
          variant={filters.is_read === false ? "default" : "outline"}
          size="sm"
          onClick={() => setFilters((f) => ({ ...f, is_read: f.is_read === false ? undefined : false }))}
        >
          Unread
        </Button>
        <Button
          variant={filters.is_archived ? "default" : "outline"}
          size="sm"
          onClick={() => setFilters((f) => ({ ...f, is_archived: f.is_archived ? undefined : true }))}
        >
          Archived
        </Button>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className={view === "grid" ? "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3" : "space-y-2"}>
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className={view === "grid" ? "h-48 w-full rounded-xl" : "h-16 w-full rounded-lg"} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          {isSearching ? "No results found." : "No bookmarks yet. Add your first one!"}
        </div>
      ) : (
        <div className={view === "grid" ? "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3" : "space-y-2"}>
          {items.map((b) => (
            <BookmarkCard key={b.id} bookmark={{ ...b, created_at: String(b.created_at) }} view={view} />
          ))}
        </div>
      )}

      {!isSearching && (bookmarksQuery.data?.total ?? 0) > 0 && (
        <div className="text-center text-sm text-muted-foreground">
          Showing {items.length} of {bookmarksQuery.data?.total} bookmarks
        </div>
      )}
    </div>
  );
}
