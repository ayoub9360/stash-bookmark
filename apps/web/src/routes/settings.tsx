import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Settings, Key, Copy, RefreshCw, Trash2, Check, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const queryClient = useQueryClient();

  const tokenQuery = trpc.apiToken.get.useQuery();

  const generateMutation = trpc.apiToken.generate.useMutation({
    onSuccess: (data) => {
      setNewToken(data.token);
      setShowToken(true);
      setConfirmRegenerate(false);
      queryClient.invalidateQueries({ queryKey: [["apiToken"]] });
    },
  });

  const revokeMutation = trpc.apiToken.revoke.useMutation({
    onSuccess: () => {
      setNewToken(null);
      setConfirmRegenerate(false);
      queryClient.invalidateQueries({ queryKey: [["apiToken"]] });
    },
  });

  const handleCopy = async () => {
    if (!newToken) return;
    await navigator.clipboard.writeText(newToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerate = () => {
    if (tokenQuery.data && !confirmRegenerate) {
      setConfirmRegenerate(true);
      return;
    }
    generateMutation.mutate();
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return "Never";
    return new Date(date).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your Stash instance configuration.
        </p>
      </div>

      {/* API Token Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            <CardTitle>API Token</CardTitle>
          </div>
          <CardDescription>
            Use this token to connect the browser extension or other API clients to your Stash instance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {tokenQuery.data ? (
            <>
              {/* Existing token info */}
              <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                {newToken ? (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      Your API Token — copy it now, it won't be shown again
                    </label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 rounded-md border bg-background px-3 py-2 text-sm font-mono break-all">
                        {showToken ? newToken : newToken.slice(0, 10) + "•".repeat(40)}
                      </code>
                      <Button
                        variant="outline"
                        size="icon"
                        className="shrink-0"
                        onClick={() => setShowToken(!showToken)}
                      >
                        {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="shrink-0"
                        onClick={handleCopy}
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded-md border bg-background px-3 py-2 text-sm font-mono text-muted-foreground">
                      stash_••••••••••••••••••••
                    </code>
                  </div>
                )}
                <div className="flex gap-6 text-xs text-muted-foreground">
                  <span>Created: {formatDate(tokenQuery.data.created_at)}</span>
                  <span>Last used: {formatDate(tokenQuery.data.last_used_at)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {confirmRegenerate ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-destructive">
                      This will invalidate the current token.
                    </span>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleGenerate}
                      disabled={generateMutation.isPending}
                    >
                      {generateMutation.isPending ? "Generating..." : "Confirm Regenerate"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setConfirmRegenerate(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={handleGenerate}
                      disabled={generateMutation.isPending}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Regenerate
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-destructive hover:text-destructive"
                      onClick={() => revokeMutation.mutate()}
                      disabled={revokeMutation.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Revoke
                    </Button>
                  </>
                )}
              </div>
            </>
          ) : tokenQuery.isLoading ? (
            <div className="h-20 animate-pulse rounded-lg bg-muted" />
          ) : (
            /* No token exists yet */
            <div className="text-center py-6 space-y-3">
              <p className="text-sm text-muted-foreground">
                No API token generated yet. Create one to connect the browser extension.
              </p>
              <Button
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                className="gap-1.5"
              >
                <Key className="h-4 w-4" />
                {generateMutation.isPending ? "Generating..." : "Generate API Token"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Extension Setup Guide */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <CardTitle>Browser Extension</CardTitle>
          </div>
          <CardDescription>
            Save bookmarks directly from your browser with the Stash Chrome Extension.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Install the Stash extension from the Chrome Web Store</li>
            <li>Click the extension icon and go to Settings</li>
            <li>
              Enter your server URL:{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                {typeof window !== "undefined" ? window.location.origin : "https://your-stash-url.com"}
              </code>
            </li>
            <li>Paste your API token from above</li>
            <li>Click "Test Connection" to verify</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
