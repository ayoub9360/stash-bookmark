import { useState } from "react";
import { BookmarkCard } from "@/components/bookmark-card";
import { SearchBar } from "@/components/search-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { createFileRoute } from "@tanstack/react-router";
import { Bookmark, Globe, Star } from "lucide-react";

const SKELETON_5 = Array.from({ length: 5 }, (_, i) => i);
const SKELETON_6 = Array.from({ length: 6 }, (_, i) => i);

export const Route = createFileRoute("/")({
  component: DashboardPage,
});

function DashboardPage() {
  const stats = trpc.dashboard.stats.useQuery(undefined, {
    refetchInterval: (query) => {
      const recent = query.state.data?.recent_bookmarks;
      if (!recent) return false;
      const hasProcessing = recent.some(
        (b) =>
          b.processing_status === "pending" ||
          b.processing_status === "processing",
      );
      return hasProcessing ? 2000 : false;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Your bookmark overview
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SearchBar />
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                {SKELETON_5.map((i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {stats.data?.top_domains.map((d) => (
                  <div
                    key={d.domain}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <DomainFavicon domain={d.domain} />
                      <span>{d.domain}</span>
                    </div>
                    <span className="text-muted-foreground">{d.count}</span>
                  </div>
                ))}
                {stats.data?.top_domains.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No bookmarks yet
                  </p>
                ) : null}
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
                {SKELETON_5.map((i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {stats.data?.top_categories.map((c) => (
                  <div
                    key={c.category}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>{c.category}</span>
                    <span className="text-muted-foreground">{c.count}</span>
                  </div>
                ))}
                {stats.data?.top_categories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No categories yet
                  </p>
                ) : null}
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
            {SKELETON_6.map((i) => (
              <Skeleton key={i} className="h-48 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {stats.data?.recent_bookmarks.map((b) => (
              <BookmarkCard
                key={b.id}
                bookmark={{ ...b, created_at: String(b.created_at) }}
              />
            ))}
            {stats.data?.recent_bookmarks.length === 0 ? (
              <p className="text-muted-foreground col-span-full text-center py-12">
                No bookmarks yet. Add your first one!
              </p>
            ) : null}
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

function DomainFavicon({ domain }: { domain: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-muted">
        <Globe className="h-3 w-3 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
      alt=""
      className="h-4 w-4 shrink-0 rounded"
      onError={() => setFailed(true)}
    />
  );
}
