import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FolderOpen, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import { trpc } from "@/lib/trpc";

export const Route = createFileRoute("/collections/")({
  component: CollectionsPage,
});

function CollectionsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const utils = trpc.useUtils();

  const collections = trpc.collection.list.useQuery();
  const create = trpc.collection.create.useMutation({
    onSuccess: () => {
      utils.collection.list.invalidate();
      setShowCreate(false);
      setName("");
      setDescription("");
    },
  });
  const remove = trpc.collection.delete.useMutation({
    onSuccess: () => utils.collection.list.invalidate(),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold sm:text-3xl">Collections</h1>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> <span className="hidden sm:inline">New Collection</span><span className="sm:hidden">New</span>
        </Button>
      </div>

      {collections.isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      ) : collections.data?.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          No collections yet. Create one to organize your bookmarks.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {collections.data?.map((c) => (
            <Card key={c.id} className="group hover:border-primary/50 transition-colors">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <Link to="/collections/$id" params={{ id: c.id }}>
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{c.name}</CardTitle>
                  </div>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                  onClick={() => {
                    if (confirm("Delete this collection?")) remove.mutate({ id: c.id });
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {c.description && <p className="text-sm text-muted-foreground">{c.description}</p>}
                <p className="text-xs text-muted-foreground mt-2">Created {formatDate(c.created_at)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent onClose={() => setShowCreate(false)}>
          <DialogHeader>
            <DialogTitle>New Collection</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate({ name, description: description || undefined });
            }}
            className="space-y-4 mt-4"
          >
            <Input placeholder="Collection name" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
            <Button type="submit" className="w-full" disabled={create.isPending}>
              {create.isPending ? "Creating..." : "Create"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
