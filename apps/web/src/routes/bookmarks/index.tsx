import { BookmarkCard } from "@/components/bookmark-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { createFileRoute } from "@tanstack/react-router";
import {
  Calendar,
  ChevronDown,
  Globe,
  Grid,
  List,
  Loader2,
  Star,
  Tag,
  X,
} from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

interface BookmarksSearch {
  q?: string;
}

export const Route = createFileRoute("/bookmarks/")({
  component: BookmarksPage,
  validateSearch: (search: Record<string, unknown>): BookmarksSearch => ({
    q: typeof search.q === "string" ? search.q : undefined,
  }),
});

type DatePreset = "today" | "week" | "month" | "year" | "custom" | null;

function getDateRange(preset: DatePreset): { after?: string; before?: string } {
  if (!preset) return {};
  const now = new Date();
  let after: Date;

  switch (preset) {
    case "today":
      after = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { after: after.toISOString() };
    case "week":
      after = new Date(now);
      after.setDate(after.getDate() - 7);
      return { after: after.toISOString() };
    case "month":
      after = new Date(now);
      after.setMonth(after.getMonth() - 1);
      return { after: after.toISOString() };
    case "year":
      after = new Date(now);
      after.setFullYear(after.getFullYear() - 1);
      return { after: after.toISOString() };
    case "custom":
      return {};
    default:
      return {};
  }
}

const datePresetLabels: Record<string, string> = {
  today: "Today",
  week: "Last 7 days",
  month: "Last 30 days",
  year: "Last year",
};

const DATE_PRESETS = ["today", "week", "month", "year"] as const;

const SKELETON_ITEMS = Array.from({ length: 6 }, (_, i) => i);

// --- Filter trigger style helper ---
function filterTriggerClass(active: boolean): string {
  return `inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
    active
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border bg-white hover:bg-accent hover:text-accent-foreground"
  }`;
}

// --- Tag Filter (isolated state for popover open/search) ---
const TagFilter = memo(function TagFilter({
  allTags,
  selectedTags,
  onToggleTag,
}: {
  allTags: string[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredTags = search
    ? allTags.filter((t) => t.toLowerCase().includes(search.toLowerCase()))
    : allTags;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={filterTriggerClass(selectedTags.length > 0)}>
        <Tag className="h-3.5 w-3.5" />
        Tags
        {selectedTags.length > 0 ? (
          <span className="ml-0.5 rounded-full bg-primary-foreground/20 px-1.5 text-[10px]">
            {selectedTags.length}
          </span>
        ) : null}
        <ChevronDown className="h-3 w-3 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0">
        <div className="p-2">
          <Input
            placeholder="Search tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
        <div className="max-h-[200px] overflow-y-auto px-2 pb-2">
          {filteredTags.length === 0 ? (
            <p className="py-3 text-center text-xs text-muted-foreground">
              No tags found
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {filteredTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onToggleTag(tag)}
                  className={`inline-flex cursor-pointer items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors ${
                    selectedTags.includes(tag)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
});

// --- Domain Filter (isolated popover state) ---
const DomainFilter = memo(function DomainFilter({
  allDomains,
  selectedDomain,
  onSelectDomain,
}: {
  allDomains: { domain: string; count: number }[];
  selectedDomain: string | undefined;
  onSelectDomain: (domain: string | undefined) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={filterTriggerClass(!!selectedDomain)}>
        <Globe className="h-3.5 w-3.5" />
        {selectedDomain ?? "Domain"}
        <ChevronDown className="h-3 w-3 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0">
        <div className="max-h-[250px] overflow-y-auto p-1">
          {selectedDomain ? (
            <button
              type="button"
              onClick={() => {
                onSelectDomain(undefined);
                setOpen(false);
              }}
              className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent"
            >
              <X className="h-3 w-3" />
              Clear selection
            </button>
          ) : null}
          {allDomains.map((d) => (
            <button
              key={d.domain}
              type="button"
              onClick={() => {
                onSelectDomain(d.domain);
                setOpen(false);
              }}
              className={`flex w-full cursor-pointer items-center justify-between rounded-sm px-2 py-1.5 text-xs transition-colors ${
                selectedDomain === d.domain
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              }`}
            >
              <span className="truncate">{d.domain}</span>
              <span className="ml-2 text-[10px] opacity-60">{d.count}</span>
            </button>
          ))}
          {allDomains.length === 0 ? (
            <p className="py-3 text-center text-xs text-muted-foreground">
              No domains yet
            </p>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
});

// --- Date Filter (isolated popover + custom date state) ---
const DateFilter = memo(function DateFilter({
  datePreset,
  customDateAfter,
  customDateBefore,
  onDatePreset,
  onCustomDateAfter,
  onCustomDateBefore,
}: {
  datePreset: DatePreset;
  customDateAfter: string;
  customDateBefore: string;
  onDatePreset: (preset: DatePreset) => void;
  onCustomDateAfter: (val: string) => void;
  onCustomDateBefore: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={filterTriggerClass(!!datePreset)}>
        <Calendar className="h-3.5 w-3.5" />
        {datePreset && datePreset !== "custom"
          ? datePresetLabels[datePreset]
          : datePreset === "custom"
            ? "Custom range"
            : "Date"}
        <ChevronDown className="h-3 w-3 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-1">
        {datePreset ? (
          <button
            type="button"
            onClick={() => {
              onDatePreset(null);
              onCustomDateAfter("");
              onCustomDateBefore("");
              setOpen(false);
            }}
            className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent"
          >
            <X className="h-3 w-3" />
            Clear selection
          </button>
        ) : null}
        {DATE_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => {
              onDatePreset(preset);
              onCustomDateAfter("");
              onCustomDateBefore("");
              setOpen(false);
            }}
            className={`flex w-full cursor-pointer items-center rounded-sm px-2 py-1.5 text-xs transition-colors ${
              datePreset === preset
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent"
            }`}
          >
            {datePresetLabels[preset]}
          </button>
        ))}
        <div className="border-t border-border mt-1 pt-1">
          <p className="px-2 py-1 text-[10px] font-medium uppercase text-muted-foreground">
            Custom range
          </p>
          <div className="space-y-1.5 px-2 pb-1">
            <div>
              <label className="text-[10px] text-muted-foreground">From</label>
              <input
                type="date"
                value={customDateAfter}
                onChange={(e) => {
                  onCustomDateAfter(e.target.value);
                  onDatePreset("custom");
                }}
                className="w-full rounded-sm border border-border bg-transparent px-2 py-1 text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">To</label>
              <input
                type="date"
                value={customDateBefore}
                onChange={(e) => {
                  onCustomDateBefore(e.target.value);
                  onDatePreset("custom");
                }}
                className="w-full rounded-sm border border-border bg-transparent px-2 py-1 text-xs"
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
});

// --- Active Filter Badges ---
function ActiveFilterBadges({
  selectedTags,
  selectedDomain,
  datePreset,
  customDateAfter,
  customDateBefore,
  onToggleTag,
  onClearDomain,
  onClearDate,
}: {
  selectedTags: string[];
  selectedDomain: string | undefined;
  datePreset: DatePreset;
  customDateAfter: string;
  customDateBefore: string;
  onToggleTag: (tag: string) => void;
  onClearDomain: () => void;
  onClearDate: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {selectedTags.map((tag) => (
        <Badge
          key={tag}
          variant="secondary"
          className="gap-1 cursor-pointer"
          onClick={() => onToggleTag(tag)}
        >
          {tag}
          <X className="h-3 w-3" />
        </Badge>
      ))}
      {selectedDomain ? (
        <Badge
          variant="secondary"
          className="gap-1 cursor-pointer"
          onClick={onClearDomain}
        >
          {selectedDomain}
          <X className="h-3 w-3" />
        </Badge>
      ) : null}
      {datePreset && datePreset !== "custom" ? (
        <Badge
          variant="secondary"
          className="gap-1 cursor-pointer"
          onClick={onClearDate}
        >
          {datePresetLabels[datePreset]}
          <X className="h-3 w-3" />
        </Badge>
      ) : null}
      {datePreset === "custom" && (customDateAfter || customDateBefore) ? (
        <Badge
          variant="secondary"
          className="gap-1 cursor-pointer"
          onClick={onClearDate}
        >
          {customDateAfter && customDateBefore
            ? `${customDateAfter} — ${customDateBefore}`
            : customDateAfter
              ? `From ${customDateAfter}`
              : `Until ${customDateBefore}`}
          <X className="h-3 w-3" />
        </Badge>
      ) : null}
    </div>
  );
}

// --- Bookmark Results Grid/List ---
const BookmarkResults = memo(function BookmarkResults({
  items,
  isLoading,
  view,
  isSearching,
  hasActiveFilters,
}: {
  items: Array<{
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
  }>;
  isLoading: boolean;
  view: "grid" | "list";
  isSearching: boolean;
  hasActiveFilters: boolean;
}) {
  const gridClass =
    view === "grid"
      ? "grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      : "space-y-2";

  if (isLoading) {
    return (
      <div className={gridClass}>
        {SKELETON_ITEMS.map((i) => (
          <Skeleton
            key={i}
            className={
              view === "grid"
                ? "h-48 w-full rounded-xl"
                : "h-16 w-full rounded-lg"
            }
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        {isSearching
          ? "No results found."
          : hasActiveFilters
            ? "No bookmarks match these filters."
            : "No bookmarks yet. Add your first one!"}
      </div>
    );
  }

  return (
    <div className={gridClass}>
      {items.map((b) => (
        <BookmarkCard
          key={b.id}
          bookmark={{ ...b, created_at: String(b.created_at) }}
          view={view}
        />
      ))}
    </div>
  );
});

// --- Main Page Component ---
function BookmarksPage() {
  const { q } = Route.useSearch();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState(q ?? "");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string | undefined>(
    undefined,
  );
  const [isFavorite, setIsFavorite] = useState<boolean | undefined>(undefined);
  const [datePreset, setDatePreset] = useState<DatePreset>(null);
  const [customDateAfter, setCustomDateAfter] = useState("");
  const [customDateBefore, setCustomDateBefore] = useState("");

  const dateRange = useMemo(() => {
    if (datePreset === "custom") {
      return {
        after: customDateAfter
          ? new Date(customDateAfter).toISOString()
          : undefined,
        before: customDateBefore
          ? new Date(customDateBefore + "T23:59:59").toISOString()
          : undefined,
      };
    }
    return getDateRange(datePreset);
  }, [datePreset, customDateAfter, customDateBefore]);

  const PAGE_SIZE = 24;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filterOptionsQuery = trpc.bookmark.filterOptions.useQuery();

  const bookmarksQuery = trpc.bookmark.list.useQuery(
    {
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      domain: selectedDomain,
      is_favorite: isFavorite,
      created_after: dateRange.after,
      created_before: dateRange.before,
      limit: visibleCount,
      offset: 0,
      sort_by: "created_at",
      sort_order: "desc",
    },
    {
      refetchInterval: (query) => {
        const items = query.state.data?.items;
        if (!items) return false;
        const hasProcessing = items.some(
          (b) =>
            b.processing_status === "pending" ||
            b.processing_status === "processing",
        );
        return hasProcessing ? 2000 : false;
      },
      placeholderData: (prev) => prev,
    },
  );

  const searchResults = trpc.search.query.useQuery(
    { query: searchQuery, limit: visibleCount, offset: 0 },
    { enabled: searchQuery.length > 0, placeholderData: (prev) => prev },
  );

  // Reset pagination when filters/search change
  const filterKey = `${searchQuery}|${selectedTags.join(",")}|${selectedDomain}|${isFavorite}|${datePreset}|${customDateAfter}|${customDateBefore}`;
  const prevFilterKey = useRef(filterKey);
  useEffect(() => {
    if (prevFilterKey.current !== filterKey) {
      prevFilterKey.current = filterKey;
      setVisibleCount(PAGE_SIZE);
    }
  }, [filterKey]);

  const isSearching = searchQuery.length > 0;
  const isLoading = isSearching
    ? searchResults.isLoading
    : bookmarksQuery.isLoading;
  const isFetchingMore = isSearching
    ? searchResults.isFetching && !searchResults.isLoading
    : bookmarksQuery.isFetching && !bookmarksQuery.isLoading;
  const items = isSearching
    ? (searchResults.data?.results.map((r) => r.bookmark) ?? [])
    : (bookmarksQuery.data?.items ?? []);
  const total = isSearching
    ? (searchResults.data?.total ?? 0)
    : (bookmarksQuery.data?.total ?? 0);
  const hasMore = items.length < total;

  const allTags = filterOptionsQuery.data?.tags ?? [];
  const allDomains = filterOptionsQuery.data?.domains ?? [];

  const hasActiveFilters =
    selectedTags.length > 0 ||
    selectedDomain !== undefined ||
    isFavorite !== undefined ||
    datePreset !== null;

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }, []);

  const clearDomain = useCallback(() => setSelectedDomain(undefined), []);

  const clearDate = useCallback(() => {
    setDatePreset(null);
    setCustomDateAfter("");
    setCustomDateBefore("");
  }, []);

  const clearAllFilters = useCallback(() => {
    setSelectedTags([]);
    setSelectedDomain(undefined);
    setIsFavorite(undefined);
    setDatePreset(null);
    setCustomDateAfter("");
    setCustomDateBefore("");
  }, []);

  return (
    <div className="space-y-6">
      {/* Search & view toggle */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="relative flex-1 min-w-0">
          <Input
            placeholder="Search bookmarks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-white p-1 flex-shrink-0">
          <Button
            variant={view === "grid" ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={() => setView("grid")}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={view === "list" ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={() => setView("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setIsFavorite((f) => (f ? undefined : true))}
          className={filterTriggerClass(!!isFavorite)}
        >
          <Star className="h-3.5 w-3.5" />
          Favorites
        </button>

        <TagFilter
          allTags={allTags}
          selectedTags={selectedTags}
          onToggleTag={toggleTag}
        />

        <DomainFilter
          allDomains={allDomains}
          selectedDomain={selectedDomain}
          onSelectDomain={setSelectedDomain}
        />

        <DateFilter
          datePreset={datePreset}
          customDateAfter={customDateAfter}
          customDateBefore={customDateBefore}
          onDatePreset={setDatePreset}
          onCustomDateAfter={setCustomDateAfter}
          onCustomDateBefore={setCustomDateBefore}
        />

        {hasActiveFilters ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-muted-foreground"
          >
            <X className="h-3.5 w-3.5" />
            Clear all
          </Button>
        ) : null}
      </div>

      {/* Active filter badges */}
      {hasActiveFilters ? (
        <ActiveFilterBadges
          selectedTags={selectedTags}
          selectedDomain={selectedDomain}
          datePreset={datePreset}
          customDateAfter={customDateAfter}
          customDateBefore={customDateBefore}
          onToggleTag={toggleTag}
          onClearDomain={clearDomain}
          onClearDate={clearDate}
        />
      ) : null}

      {/* Results */}
      <BookmarkResults
        items={items}
        isLoading={isLoading}
        view={view}
        isSearching={isSearching}
        hasActiveFilters={hasActiveFilters}
      />

      {total > 0 ? (
        <div className="flex flex-col items-center gap-3">
          {hasMore ? (
            <Button
              variant="outline"
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              disabled={isFetchingMore}
              className="px-8"
            >
              {isFetchingMore ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                `Load more`
              )}
            </Button>
          ) : null}
          <span className="text-sm text-muted-foreground">
            Showing {items.length} of {total} bookmarks
          </span>
        </div>
      ) : null}
    </div>
  );
}
