import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Bookmark, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";

const WHITESPACE_RE = /\s+/g;
const TAG_SEPARATOR_RE = /-/g;
const WORD_START_RE = /\b\w/g;

export const Route = createFileRoute("/add")({
  component: AddBookmarkPage,
});

function AddBookmarkPage() {
  const [url, setUrl] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createBookmark = trpc.bookmark.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [["bookmark"]] });
      queryClient.invalidateQueries({ queryKey: [["search"]] });
      navigate({ to: "/bookmarks" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    createBookmark.mutate({ url: url.trim(), tags });
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase().replace(WHITESPACE_RE, "-");
    if (tag) {
      setTags((prev) => prev.includes(tag) ? prev : [...prev, tag]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  return (
    <div className="mx-auto max-w-lg min-h-[calc(100vh-3.5rem)] md:min-h-screen flex items-center">
      <Card className="w-full">
        <CardHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Bookmark className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-center">Add Bookmark</CardTitle>
          <CardDescription className="text-center">
            Paste a URL and we'll do the rest — fetch, parse, summarize, and categorize.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">URL</label>
              <Input
                type="url"
                placeholder="https://example.com/article"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Tags (optional)</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                />
                <Button type="button" variant="outline" size="icon" onClick={addTag}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag.replace(TAG_SEPARATOR_RE, " ").replace(WORD_START_RE, (c) => c.toUpperCase())}
                      <button type="button" onClick={() => removeTag(tag)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {createBookmark.isError && (
              <p className="text-sm text-destructive">
                Failed to add bookmark. Please check the URL and try again.
              </p>
            )}

            <Button type="submit" className="w-full" disabled={createBookmark.isPending}>
              {createBookmark.isPending ? "Adding..." : "Add Bookmark"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
