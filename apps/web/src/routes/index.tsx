import { createFileRoute, Link } from "@tanstack/react-router";
import { Bookmark, Star, BookOpen, Archive, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchBar } from "@/components/search-bar";
import { BookmarkCard } from "@/components/bookmark-card";
import { trpc } from "@/lib/trpc";

export const Route = createFileRoute("/")({
  component: DashboardPage,
});

function DashboardPage() {
  const stats = trpc.dashboard.stats.useQuery();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Your bookmark overview</p>
        </div>
        <div className="flex items-center gap-3">
          <SearchBar />
          <Link to="/add">
            <Button>
              <Plus className="h-4 w-4" />
              Add Bookmark
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Bookmarks"
          value={stats.data?.total_bookmarks}
          icon={Bookmark}
          loading={stats.isLoading}
        />
        <StatCard
          title="Favorites"
          value={stats.data?.total_favorites}
          icon={Star}
          loading={stats.isLoading}
        />
        <StatCard
          title="Unread"
          value={stats.data?.total_unread}
          icon={BookOpen}
          loading={stats.isLoading}
        />
        <StatCard
          title="Archived"
          value={stats.data?.total_archived}
          icon={Archive}
          loading={stats.isLoading}
        />
      </div>

      {/* Top domains & categories */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Domains</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
              </div>
            ) : (
              <div className="space-y-2">
                {stats.data?.top_domains.map((d) => (
                  <div key={d.domain} className="flex items-center justify-between text-sm">
                    <span>{d.domain}</span>
                    <span className="text-muted-foreground">{d.count}</span>
                  </div>
                ))}
                {stats.data?.top_domains.length === 0 && (
                  <p className="text-sm text-muted-foreground">No bookmarks yet</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Categories</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
              </div>
            ) : (
              <div className="space-y-2">
                {stats.data?.top_categories.map((c) => (
                  <div key={c.category} className="flex items-center justify-between text-sm">
                    <span>{c.category}</span>
                    <span className="text-muted-foreground">{c.count}</span>
                  </div>
                ))}
                {stats.data?.top_categories.length === 0 && (
                  <p className="text-sm text-muted-foreground">No categories yet</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent bookmarks */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">Recent Bookmarks</h2>
        {stats.isLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {stats.data?.recent_bookmarks.map((b) => (
              <BookmarkCard key={b.id} bookmark={{ ...b, created_at: String(b.created_at) }} />
            ))}
            {stats.data?.recent_bookmarks.length === 0 && (
              <p className="text-muted-foreground col-span-full text-center py-12">
                No bookmarks yet. Add your first one!
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  loading,
}: {
  title: string;
  value?: number;
  icon: React.ComponentType<{ className?: string }>;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          {loading ? (
            <Skeleton className="h-7 w-16 mt-1" />
          ) : (
            <p className="text-2xl font-bold">{value ?? 0}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
