import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";

interface EditBookmarkDialogProps {
  bookmark: {
    id: string;
    title: string | null;
    category: string | null;
    tags: string[];
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditBookmarkDialog({ bookmark, open, onOpenChange }: EditBookmarkDialogProps) {
  const utils = trpc.useUtils();
  const [title, setTitle] = useState(bookmark.title ?? "");
  const [category, setCategory] = useState(bookmark.category ?? "");
  const [tags, setTags] = useState<string[]>(bookmark.tags);
  const [tagInput, setTagInput] = useState("");
  const [selectedCollection, setSelectedCollection] = useState("");

  const collections = trpc.collection.list.useQuery(undefined, { enabled: open });

  const updateBookmark = trpc.bookmark.update.useMutation({
    onSuccess: () => {
      utils.bookmark.list.invalidate();
      utils.bookmark.get.invalidate({ id: bookmark.id });
    },
  });

  const addToCollection = trpc.collection.addBookmark.useMutation({
    onSuccess: () => {
      utils.collection.list.invalidate();
      setSelectedCollection("");
    },
  });

  useEffect(() => {
    if (open) {
      setTitle(bookmark.title ?? "");
      setCategory(bookmark.category ?? "");
      setTags([...bookmark.tags]);
      setTagInput("");
      setSelectedCollection("");
    }
  }, [open, bookmark.id]);

  function handleAddTag() {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
    }
    setTagInput("");
  }

  function handleRemoveTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
  }

  function handleSave() {
    updateBookmark.mutate({
      id: bookmark.id,
      data: {
        title: title || undefined,
        category: category || null,
        tags,
      },
    });

    if (selectedCollection) {
      addToCollection.mutate({
        collection_id: selectedCollection,
        bookmark_id: bookmark.id,
      });
    }

    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Bookmark</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Bookmark title" />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Category</label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Technology, Design, News..." />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Tags</label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add a tag..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <Button type="button" variant="outline" size="sm" onClick={handleAddTag} className="flex-shrink-0">
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Add to Collection */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Add to Collection</label>
            {collections.data && collections.data.length > 0 ? (
              <select
                value={selectedCollection}
                onChange={(e) => setSelectedCollection(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">None</option>
                {collections.data.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-muted-foreground">No collections yet.</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={updateBookmark.isPending}>
              {updateBookmark.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
