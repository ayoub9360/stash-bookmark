import { useState, useEffect, useCallback } from "react";
import { serverUrl } from "../../lib/storage";
import type { ExtractedContent } from "../../lib/extractors";
import type { ListBookmarkItem } from "../../lib/api";

type View = "save" | "saving" | "success" | "error" | "not-configured";

interface TabInfo {
  url: string;
  title: string;
  content?: ExtractedContent;
}

export function App() {
  const [view, setView] = useState<View>("save");
  const [tab, setTab] = useState<TabInfo | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [recent, setRecent] = useState<ListBookmarkItem[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [stashUrl, setStashUrl] = useState("");

  // Initialize: get tab info + extract content + load recent
  useEffect(() => {
    (async () => {
      // Check configuration
      const configStatus = await browser.runtime.sendMessage({ type: "GET_CONFIG_STATUS" });
      if (!configStatus.configured) {
        setView("not-configured");
        return;
      }

      // Get server URL for links
      const url = await serverUrl.getValue();
      setStashUrl(url);

      // Get active tab
      const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!activeTab?.id || !activeTab.url) return;

      const tabInfo: TabInfo = {
        url: activeTab.url,
        title: activeTab.title ?? "",
      };

      // Extract content from page
      try {
        const response = await browser.tabs.sendMessage(activeTab.id, {
          type: "EXTRACT_CONTENT",
        });
        if (response?.success) {
          tabInfo.content = response.content;
          // Use extracted title if available
          if (response.content.title) {
            tabInfo.title = response.content.title;
          }
        }
      } catch {
        // Content script not available — will send URL only
      }

      setTab(tabInfo);

      // Load recent bookmarks
      try {
        const recentResponse = await browser.runtime.sendMessage({ type: "GET_RECENT" });
        if (recentResponse?.success) {
          setRecent(recentResponse.data.bookmarks);
        }
      } catch {
        // Non-critical
      }
    })();
  }, []);

  const addTag = useCallback(() => {
    const tag = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (tag && !tags.includes(tag)) {
      setTags((prev) => [...prev, tag]);
      setTagInput("");
    }
  }, [tagInput, tags]);

  const removeTag = useCallback((tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const handleSave = useCallback(async () => {
    if (!tab) return;
    setView("saving");
    setErrorMsg("");

    try {
      const response = await browser.runtime.sendMessage({
        type: "SAVE_BOOKMARK",
        data: {
          url: tab.url,
          tags: tags.length > 0 ? tags : undefined,
          content: tab.content,
        },
      });

      if (response?.success) {
        setView("success");
        // Update badge
        const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
        if (activeTab?.id) {
          await browser.action.setBadgeText({ text: "✓", tabId: activeTab.id });
          await browser.action.setBadgeBackgroundColor({ color: "#22c55e", tabId: activeTab.id });
          setTimeout(() => {
            browser.action.setBadgeText({ text: "", tabId: activeTab.id });
          }, 2000);
        }
      } else {
        setErrorMsg(response?.error ?? "Failed to save bookmark");
        setView("error");
      }
    } catch (err: any) {
      setErrorMsg(err.message ?? "Failed to save bookmark");
      setView("error");
    }
  }, [tab, tags]);

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}d`;
  };

  if (view === "not-configured") {
    return (
      <div className="w-[360px] p-4">
        <Header />
        <div className="mt-4 rounded-lg border border-border bg-secondary/50 p-4 text-center">
          <p className="text-sm font-medium">Extension not configured</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Set your server URL and API token to get started.
          </p>
          <button
            onClick={() => browser.runtime.openOptionsPage()}
            className="mt-3 rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Open Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[360px]">
      <div className="p-4 pb-3">
        <Header />

        {/* Save form */}
        {(view === "save" || view === "saving") && tab && (
          <div className="mt-4 space-y-3">
            {/* URL */}
            <div className="rounded-lg border border-border bg-secondary/50 px-3 py-2">
              <p className="truncate text-xs text-muted-foreground">{tab.url}</p>
              {tab.title && (
                <p className="mt-0.5 truncate text-sm font-medium">{tab.title}</p>
              )}
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <div className="flex gap-1.5">
                <input
                  type="text"
                  className="flex-1 rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm outline-none ring-ring focus:ring-2"
                  placeholder="Add tags..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                />
                <button
                  onClick={addTag}
                  className="rounded-lg border border-border px-2.5 py-1.5 text-sm transition-colors hover:bg-secondary"
                >
                  +
                </button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs"
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Content badge */}
            {tab.content?.textContent && (
              <p className="text-xs text-muted-foreground">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 mr-1" />
                Content extracted from page
              </p>
            )}

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={view === "saving"}
              className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {view === "saving" ? "Saving..." : "Save Bookmark"}
            </button>
          </div>
        )}

        {/* Success */}
        {view === "success" && (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 text-center">
            <div className="text-2xl">&#10003;</div>
            <p className="mt-1 text-sm font-medium text-green-700">Bookmark saved!</p>
            <p className="mt-0.5 text-xs text-green-600">
              AI processing will run in the background.
            </p>
            <button
              onClick={() => setView("save")}
              className="mt-2 text-xs text-green-700 underline"
            >
              Save another
            </button>
          </div>
        )}

        {/* Error */}
        {view === "error" && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-center">
            <p className="text-sm font-medium text-red-700">Failed to save</p>
            <p className="mt-0.5 text-xs text-red-600">{errorMsg}</p>
            <button
              onClick={() => setView("save")}
              className="mt-2 text-xs text-red-700 underline"
            >
              Try again
            </button>
          </div>
        )}
      </div>

      {/* Recent bookmarks */}
      {recent.length > 0 && (
        <div className="border-t border-border px-4 py-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Recent
          </p>
          <div className="space-y-1">
            {recent.map((item) => (
              <a
                key={item.id}
                href={`${stashUrl}/bookmarks/${item.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-secondary"
              >
                {item.favicon_url ? (
                  <img
                    src={item.favicon_url}
                    alt=""
                    className="h-4 w-4 rounded-sm"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <span className="flex h-4 w-4 items-center justify-center rounded-sm bg-muted text-[10px]">
                    B
                  </span>
                )}
                <span className="flex-1 truncate">
                  {item.title ?? new URL(item.url).hostname}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {timeAgo(item.created_at)}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-border px-4 py-2.5 flex items-center justify-between">
        <a
          href={stashUrl || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Open Stash &rarr;
        </a>
        <button
          onClick={() => browser.runtime.openOptionsPage()}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Settings
        </button>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
        </svg>
      </div>
      <span className="text-base font-bold">Stash</span>
    </div>
  );
}
