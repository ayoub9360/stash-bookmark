import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink, Star, Archive, BookOpen, Trash2, Clock, Globe, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import { trpc } from "@/lib/trpc";

export const Route = createFileRoute("/bookmarks/$id")({
  component: BookmarkDetailPage,
});

function BookmarkDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const bookmark = trpc.bookmark.get.useQuery({ id });
  const toggleFav = trpc.bookmark.toggleFavorite.useMutation({
    onSuccess: () => { utils.bookmark.get.invalidate({ id }); },
  });
  const toggleArchive = trpc.bookmark.toggleArchive.useMutation({
    onSuccess: () => { utils.bookmark.get.invalidate({ id }); },
  });
  const toggleRead = trpc.bookmark.toggleRead.useMutation({
    onSuccess: () => { utils.bookmark.get.invalidate({ id }); },
  });
  const deleteBookmark = trpc.bookmark.delete.useMutation({
    onSuccess: () => { navigate({ to: "/bookmarks" }); },
  });

  if (bookmark.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const b = bookmark.data;
  if (!b) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Bookmark not found</p>
        <Link to="/bookmarks"><Button variant="outline" className="mt-4">Go back</Button></Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/bookmarks">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{b.title ?? b.url}</h1>
          <a href={b.url} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1">
            {b.domain} <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button variant={b.is_favorite ? "default" : "outline"} size="sm" onClick={() => toggleFav.mutate({ id })}>
          <Star className={`h-4 w-4 ${b.is_favorite ? "fill-current" : ""}`} /> Favorite
        </Button>
        <Button variant={b.is_archived ? "default" : "outline"} size="sm" onClick={() => toggleArchive.mutate({ id })}>
          <Archive className="h-4 w-4" /> Archive
        </Button>
        <Button variant={b.is_read ? "default" : "outline"} size="sm" onClick={() => toggleRead.mutate({ id })}>
          <BookOpen className="h-4 w-4" /> {b.is_read ? "Read" : "Mark Read"}
        </Button>
        <div className="flex-1" />
        <Button variant="destructive" size="sm" onClick={() => {
          if (confirm("Delete this bookmark?")) deleteBookmark.mutate({ id });
        }}>
          <Trash2 className="h-4 w-4" /> Delete
        </Button>
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4 space-y-2">
            {b.category && (
              <div className="flex items-center gap-2 text-sm">
                <Tag className="h-4 w-4 text-muted-foreground" /> {b.category}
              </div>
            )}
            {b.reading_time_min && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" /> {b.reading_time_min} min read
              </div>
            )}
            {b.language && (
              <div className="flex items-center gap-2 text-sm">
                <Globe className="h-4 w-4 text-muted-foreground" /> {b.language}
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              Added {formatDate(b.created_at)}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardContent className="p-4">
            {b.summary && (
              <div className="mb-3">
                <h3 className="text-sm font-semibold mb-1">AI Summary</h3>
                <p className="text-sm text-muted-foreground">{b.summary}</p>
              </div>
            )}
            {b.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {b.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reader mode */}
      {b.content && (
        <Card>
          <CardHeader>
            <CardTitle>Reader View</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">
              {b.content}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
