import { Link } from "@tanstack/react-router";
import { Star, Archive, ExternalLink, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatRelativeDate } from "@/lib/utils";
import { trpc } from "@/lib/trpc";

interface BookmarkCardProps {
  bookmark: {
    id: string;
    url: string;
    title: string | null;
    description: string | null;
    summary: string | null;
    favicon_url: string | null;
    domain: string | null;
    category: string | null;
    tags: string[];
    is_favorite: boolean;
    is_archived: boolean;
    reading_time_min: number | null;
    processing_status: string;
    created_at: string | Date;
  };
  view?: "grid" | "list";
}

export function BookmarkCard({ bookmark, view = "grid" }: BookmarkCardProps) {
  const utils = trpc.useUtils();
  const toggleFav = trpc.bookmark.toggleFavorite.useMutation({
    onSuccess: () => utils.bookmark.list.invalidate(),
  });
  const toggleArchive = trpc.bookmark.toggleArchive.useMutation({
    onSuccess: () => utils.bookmark.list.invalidate(),
  });

  const isProcessing = bookmark.processing_status === "pending" || bookmark.processing_status === "processing";

  if (view === "list") {
    return (
      <div className="flex items-center gap-4 rounded-lg border border-border p-3 hover:bg-accent/50 transition-colors">
        {bookmark.favicon_url && (
          <img src={bookmark.favicon_url} alt="" className="h-5 w-5 rounded" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        )}
        <Link to="/bookmarks/$id" params={{ id: bookmark.id }} className="flex-1 min-w-0">
          <div className="font-medium truncate">{bookmark.title ?? bookmark.url}</div>
          <div className="text-xs text-muted-foreground truncate">{bookmark.domain} &middot; {formatRelativeDate(bookmark.created_at)}</div>
        </Link>
        <div className="flex items-center gap-1">
          {bookmark.category && <Badge variant="secondary">{bookmark.category}</Badge>}
          <Button variant="ghost" size="icon" onClick={() => toggleFav.mutate({ id: bookmark.id })}>
            <Star className={`h-4 w-4 ${bookmark.is_favorite ? "fill-yellow-500 text-yellow-500" : ""}`} />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className="group overflow-hidden hover:border-primary/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            {bookmark.favicon_url && (
              <img src={bookmark.favicon_url} alt="" className="h-4 w-4 rounded flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            )}
            <span className="text-xs text-muted-foreground truncate">{bookmark.domain}</span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleFav.mutate({ id: bookmark.id })}>
              <Star className={`h-3.5 w-3.5 ${bookmark.is_favorite ? "fill-yellow-500 text-yellow-500" : ""}`} />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleArchive.mutate({ id: bookmark.id })}>
              <Archive className={`h-3.5 w-3.5 ${bookmark.is_archived ? "text-primary" : ""}`} />
            </Button>
            <a href={bookmark.url} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </a>
          </div>
        </div>

        <Link to="/bookmarks/$id" params={{ id: bookmark.id }}>
          <h3 className="font-semibold line-clamp-2 mb-1 hover:text-primary transition-colors">
            {bookmark.title ?? bookmark.url}
          </h3>
        </Link>

        {isProcessing ? (
          <div className="text-xs text-muted-foreground italic">Processing...</div>
        ) : (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {bookmark.summary ?? bookmark.description ?? ""}
          </p>
        )}

        <div className="flex items-center justify-between mt-auto">
          <div className="flex flex-wrap gap-1">
            {bookmark.category && <Badge variant="secondary" className="text-xs">{bookmark.category}</Badge>}
            {bookmark.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
            ))}
          </div>
          {bookmark.reading_time_min && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {bookmark.reading_time_min}m
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground mt-2">
          {formatRelativeDate(bookmark.created_at)}
        </div>
      </CardContent>
    </Card>
  );
}
