import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BookmarkCard } from "@/components/bookmark-card";
import { trpc } from "@/lib/trpc";

export const Route = createFileRoute("/collections/$id")({
  component: CollectionDetailPage,
});

function CollectionDetailPage() {
  const { id } = Route.useParams();
  const collection = trpc.collection.get.useQuery({ id });

  if (collection.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
        </div>
      </div>
    );
  }

  const c = collection.data;
  if (!c) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Collection not found</p>
        <Link to="/collections"><Button variant="outline" className="mt-4">Go back</Button></Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Link to="/collections">
          <Button variant="ghost" size="icon" className="flex-shrink-0 mt-0.5"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <FolderOpen className="h-5 w-5 text-primary flex-shrink-0 mt-1.5" />
        <div className="min-w-0">
          <h1 className="text-xl font-bold sm:text-2xl break-words">{c.name}</h1>
          {c.description && <p className="text-sm text-muted-foreground">{c.description}</p>}
        </div>
      </div>

      {c.bookmarks.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          No bookmarks in this collection yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {c.bookmarks.map((b) => (
            <BookmarkCard key={b.id} bookmark={{ ...b, created_at: String(b.created_at) }} />
          ))}
        </div>
      )}
    </div>
  );
}
