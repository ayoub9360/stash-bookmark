import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import { extractDomain, estimateReadingTime } from "@stash/shared";
import type { ParsedContent } from "@stash/shared";
import { extractMetadata } from "./metadata.js";

export async function fetchAndParse(url: string): Promise<ParsedContent> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; StashBot/1.0; +https://github.com/stash)",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const dom = new JSDOM(html, { url });
  const document = dom.window.document;

  // Extract metadata from HTML
  const metadata = extractMetadata(document, url);

  // Parse with Readability
  const reader = new Readability(document);
  const article = reader.parse();

  const content = article?.textContent ?? null;
  const readingTime = content ? estimateReadingTime(content) : null;

  return {
    title: article?.title ?? metadata.title ?? null,
    description: metadata.description ?? article?.excerpt ?? null,
    content,
    html: article?.content ?? null,
    favicon_url: metadata.favicon_url,
    og_image_url: metadata.og_image_url,
    domain: extractDomain(url),
    language: metadata.language,
    published_at: metadata.published_at,
    reading_time_min: readingTime,
  };
}
