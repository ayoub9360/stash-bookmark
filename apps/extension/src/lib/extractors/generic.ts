import type { ExtractedContent } from "./types";

export function extractGeneric(): ExtractedContent {
  const title =
    document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.content ??
    document.title;

  const description =
    document.querySelector<HTMLMetaElement>('meta[property="og:description"]')?.content ??
    document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content ??
    undefined;

  const ogImage =
    document.querySelector<HTMLMetaElement>('meta[property="og:image"]')?.content ?? undefined;

  // Try to find the article / main content area
  const articleEl =
    document.querySelector("article") ??
    document.querySelector("[role='main']") ??
    document.querySelector("main") ??
    document.body;

  const textContent = articleEl.innerText?.slice(0, 50_000) ?? "";

  // Try to get a clean HTML snapshot of the main content
  const htmlSnapshot = articleEl.innerHTML?.slice(0, 100_000) ?? undefined;

  // Favicon
  const faviconEl =
    document.querySelector<HTMLLinkElement>('link[rel="icon"]') ??
    document.querySelector<HTMLLinkElement>('link[rel="shortcut icon"]');
  const faviconUrl = faviconEl?.href ?? `${window.location.origin}/favicon.ico`;

  return {
    title,
    description,
    textContent,
    htmlSnapshot,
    ogImageUrl: ogImage,
    faviconUrl,
  };
}
