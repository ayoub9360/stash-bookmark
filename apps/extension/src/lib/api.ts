import { serverUrl, apiToken } from "./storage";

async function getConfig() {
  const [url, token] = await Promise.all([serverUrl.getValue(), apiToken.getValue()]);
  return { url: url.replace(/\/+$/, ""), token };
}

async function apiFetch(path: string, init?: RequestInit) {
  const { url, token } = await getConfig();
  if (!token) throw new Error("API token not configured");

  const res = await fetch(`${url}/api/v1${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Request failed: ${res.status}`);
  }

  return res.json();
}

export interface CreateBookmarkPayload {
  url: string;
  tags?: string[];
  content?: {
    title?: string;
    description?: string;
    textContent?: string;
    htmlSnapshot?: string;
    ogImageUrl?: string;
    faviconUrl?: string;
  };
}

export interface BookmarkResponse {
  id: string;
  url: string;
  title: string | null;
  processing_status: string;
  created_at: string;
}

export interface ListBookmarkItem {
  id: string;
  url: string;
  title: string | null;
  favicon_url: string | null;
  processing_status: string;
  created_at: string;
}

export const api = {
  verify: () => apiFetch("/verify") as Promise<{ ok: boolean; version: string }>,

  createBookmark: (data: CreateBookmarkPayload) =>
    apiFetch("/bookmarks", {
      method: "POST",
      body: JSON.stringify(data),
    }) as Promise<BookmarkResponse>,

  listBookmarks: (limit = 5) =>
    apiFetch(`/bookmarks?limit=${limit}`) as Promise<{
      bookmarks: ListBookmarkItem[];
      total: number;
    }>,
};
