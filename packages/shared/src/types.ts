export interface Bookmark {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  summary: string | null;
  content: string | null;
  html_snapshot: string | null;
  favicon_url: string | null;
  og_image_url: string | null;
  domain: string | null;
  language: string | null;
  published_at: string | null;
  reading_time_min: number | null;
  category: string | null;
  tags: string[];
  is_favorite: boolean;
  is_archived: boolean;
  is_read: boolean;
  processing_status: ProcessingStatus;
  created_at: string;
  updated_at: string;
}

export type ProcessingStatus = "pending" | "processing" | "completed" | "failed";

export interface Category {
  id: string;
  name: string;
  icon: string | null;
  parent_id: string | null;
}

export interface Collection {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface SearchResult {
  bookmark: Bookmark;
  score: number;
  highlight?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface DashboardStats {
  total_bookmarks: number;
  total_favorites: number;
  total_unread: number;
  total_archived: number;
  top_domains: { domain: string; count: number }[];
  top_categories: { category: string; count: number }[];
  recent_bookmarks: Bookmark[];
}

export interface ParsedContent {
  title: string | null;
  description: string | null;
  content: string | null;
  html: string | null;
  favicon_url: string | null;
  og_image_url: string | null;
  domain: string;
  language: string | null;
  published_at: string | null;
  reading_time_min: number | null;
}

export interface LLMAnalysis {
  summary: string;
  category: string;
  tags: string[];
}
