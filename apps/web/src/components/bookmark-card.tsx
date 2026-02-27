import { memo, useState } from "react";
import { Star, Clock, MoreVertical, Pencil, Trash2, FolderPlus, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { formatRelativeDate } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { EditBookmarkDialog } from "@/components/edit-bookmark-dialog";

const TAG_SEPARATOR_RE = /-/g;
const WORD_START_RE = /\b\w/g;

function formatTagLabel(tag: string): string {
  return tag.replace(TAG_SEPARATOR_RE, " ").replace(WORD_START_RE, (c) => c.toUpperCase());
}

interface BookmarkCardProps {
  bookmark: {
    id: string;
    url: string;
    title: string | null;
    description: string | null;
    summary: string | null;
    favicon_url: string | null;
    og_image_url: string | null;
    domain: string | null;
    category: string | null;
    tags: string[];
    is_favorite: boolean;
    reading_time_min: number | null;
    processing_status: string;
    created_at: string | Date;
  };
  view?: "grid" | "list";
}

export const BookmarkCard = memo(function BookmarkCard({ bookmark, view = "grid" }: BookmarkCardProps) {
  const utils = trpc.useUtils();
  const [editOpen, setEditOpen] = useState(false);

  const toggleFav = trpc.bookmark.toggleFavorite.useMutation({
    onSuccess: () => utils.bookmark.list.invalidate(),
  });
  const deleteBookmark = trpc.bookmark.delete.useMutation({
    onSuccess: () => utils.bookmark.list.invalidate(),
  });

  const isProcessing = bookmark.processing_status === "pending" || bookmark.processing_status === "processing";

  const dropdownMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-6 w-6 cursor-pointer">
        <MoreVertical className="h-3.5 w-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => toggleFav.mutate({ id: bookmark.id })}>
          <Star className={`h-3.5 w-3.5 ${bookmark.is_favorite ? "fill-yellow-500 text-yellow-500" : ""}`} />
          {bookmark.is_favorite ? "Unfavorite" : "Favorite"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setEditOpen(true)}>
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => window.open(bookmark.url, "_blank", "noopener,noreferrer")}>
          <ExternalLink className="h-3.5 w-3.5" />
          Open link
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => {
            if (confirm("Delete this bookmark?")) deleteBookmark.mutate({ id: bookmark.id });
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (view === "list") {
    return (
      <>
        <div className="flex items-center gap-3 rounded-lg border border-border bg-white p-3 hover:bg-accent/50 transition-colors cursor-pointer sm:gap-4">
          {bookmark.favicon_url && (
            <img src={bookmark.favicon_url} alt="" className="h-5 w-5 rounded flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          )}
          <a href={bookmark.url} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate sm:text-base">{bookmark.title ?? bookmark.url}</div>
            <div className="text-xs text-muted-foreground truncate">{bookmark.domain} &middot; {formatRelativeDate(bookmark.created_at)}</div>
          </a>
          <div className="flex items-center gap-1 flex-shrink-0">
            {bookmark.category && <Badge variant="secondary" className="hidden sm:inline-flex">{bookmark.category}</Badge>}
            {bookmark.is_favorite && <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />}
            <div onClick={(e) => e.preventDefault()}>
              {dropdownMenu}
            </div>
          </div>
        </div>
        <EditBookmarkDialog bookmark={bookmark} open={editOpen} onOpenChange={setEditOpen} />
      </>
    );
  }

  return (
    <>
      <a href={bookmark.url} target="_blank" rel="noopener noreferrer" className="block h-full">
      <Card className="group hover:border-primary/50 transition-colors h-full flex flex-col cursor-pointer">
        <div className="aspect-video w-full overflow-hidden rounded-t-xl border-b border-border">
          {bookmark.og_image_url ? (
            <img
              src={bookmark.og_image_url}
              alt=""
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
              onError={(e) => {
                const parent = (e.target as HTMLImageElement).parentElement!;
                (e.target as HTMLImageElement).style.display = "none";
                const placeholder = parent.querySelector(".og-placeholder") as HTMLElement;
                if (placeholder) placeholder.style.display = "flex";
              }}
            />
          ) : null}
          <div
            className={`og-placeholder h-full w-full items-center justify-center bg-muted/50 ${bookmark.og_image_url ? "hidden" : "flex"}`}
          >
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-muted-foreground/40">
              <rect x="6" y="10" width="36" height="28" rx="3" stroke="currentColor" strokeWidth="2" />
              <circle cx="17" cy="22" r="4" stroke="currentColor" strokeWidth="2" />
              <path d="M6 32l10-8 6 5 8-10 12 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
        <CardContent className="p-3 flex flex-col flex-1">
          <div className="flex items-start justify-between gap-1 mb-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              {bookmark.favicon_url && (
                <img src={bookmark.favicon_url} alt="" className="h-4 w-4 rounded flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              )}
              <span className="text-xs text-muted-foreground truncate">{bookmark.domain}</span>
              {bookmark.is_favorite && <Star className="h-3 w-3 fill-yellow-500 text-yellow-500 flex-shrink-0" />}
            </div>
            <div className="flex items-center flex-shrink-0" onClick={(e) => e.preventDefault()}>
              {dropdownMenu}
            </div>
          </div>

          <h3 className="text-sm font-semibold truncate mb-1 group-hover:text-primary transition-colors">
            {bookmark.title ?? bookmark.url}
          </h3>

          {isProcessing ? (
            <div className="text-xs text-muted-foreground italic">Processing...</div>
          ) : (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {bookmark.summary ?? bookmark.description ?? ""}
            </p>
          )}

          <div className="flex-1" />
          <div className="flex flex-wrap gap-1">
            {bookmark.category && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{bookmark.category}</Badge>}
            {bookmark.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">{formatTagLabel(tag)}</Badge>
            ))}
          </div>

          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[10px] text-muted-foreground">
              {formatRelativeDate(bookmark.created_at)}
            </span>
            {bookmark.reading_time_min != null ? (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground" title="Estimated reading time">
                <Clock className="h-2.5 w-2.5" />
                {bookmark.reading_time_min}m
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
      </a>
      <EditBookmarkDialog bookmark={bookmark} open={editOpen} onOpenChange={setEditOpen} />
    </>
  );
});
