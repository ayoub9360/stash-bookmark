import type { SiteRule } from "./types";
import type { ExtractedContent } from "../types";

/**
 * Match a URL against a glob pattern.
 * Supports * (any segment) and ** (any path).
 * Pattern format: "domain.com/path/segments"
 */
function matchUrl(url: string, pattern: string): boolean {
  try {
    const parsed = new URL(url);
    // Build the string to match: hostname + pathname (no protocol/query)
    const target = (parsed.hostname + parsed.pathname).replace(/\/+$/, "");
    const pat = pattern.replace(/^https?:\/\//, "").replace(/\/+$/, "");

    // Convert glob to regex
    const regex = pat
      .replace(/[.+^${}()|[\]\\]/g, "\\$&") // escape special regex chars (not *)
      .replace(/\*\*/g, "<<<GLOBSTAR>>>")
      .replace(/\*/g, "[^/]*")
      .replace(/<<<GLOBSTAR>>>/g, ".*");

    return new RegExp(`^${regex}$`).test(target);
  } catch {
    return false;
  }
}

/**
 * Find the first matching rule for a given URL.
 * User rules take priority (checked first).
 */
export function findMatchingRule(
  url: string,
  userRules: SiteRule[],
  builtinRules: SiteRule[],
): SiteRule | null {
  // User rules first (can override built-in)
  for (const rule of userRules) {
    if (rule.enabled === false) continue;
    if (rule.match.some((pattern) => matchUrl(url, pattern))) {
      return rule;
    }
  }

  // Then built-in rules
  for (const rule of builtinRules) {
    if (rule.enabled === false) continue;
    if (rule.match.some((pattern) => matchUrl(url, pattern))) {
      return rule;
    }
  }

  return null;
}

/**
 * Apply a rule to the current document and extract content.
 */
export function applyRule(rule: SiteRule): ExtractedContent {
  // Get the scoped element (or body)
  let scopeEl: Element | null = null;
  if (rule.scope) {
    // scope can be comma-separated selectors — try each
    for (const sel of rule.scope.split(",").map((s) => s.trim())) {
      scopeEl = document.querySelector(sel);
      if (scopeEl) break;
    }
  }
  scopeEl = scopeEl ?? document.body;

  // Clone to avoid mutating the real DOM
  const clone = scopeEl.cloneNode(true) as Element;

  // Remove excluded elements
  if (rule.exclude) {
    for (const selector of rule.exclude) {
      clone.querySelectorAll(selector).forEach((el) => el.remove());
    }
  }

  // Extract fields using targeted selectors
  const selectors = rule.selectors;

  const title = extractField(selectors?.title, clone, "textContent")
    ?? document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.content
    ?? document.title;

  const author = extractField(selectors?.author, clone, "textContent");

  const contentText = extractField(selectors?.content, clone, "textContent")
    ?? (clone as HTMLElement).innerText?.slice(0, 50_000)
    ?? clone.textContent?.slice(0, 50_000)
    ?? "";

  const imageUrl = extractField(selectors?.image, clone, "src")
    ?? extractField(selectors?.image, clone, "content")
    ?? document.querySelector<HTMLMetaElement>('meta[property="og:image"]')?.content
    ?? undefined;

  const description =
    document.querySelector<HTMLMetaElement>('meta[property="og:description"]')?.content ??
    document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content ??
    contentText.slice(0, 300);

  // Build full text content
  const parts: string[] = [];
  if (author) parts.push(`Author: ${author}`);
  if (title) parts.push(title);
  if (contentText) parts.push(contentText);

  // Favicon
  const faviconEl =
    document.querySelector<HTMLLinkElement>('link[rel="icon"]') ??
    document.querySelector<HTMLLinkElement>('link[rel="shortcut icon"]');
  const faviconUrl = faviconEl?.href ?? `${window.location.origin}/favicon.ico`;

  return {
    title: author ? `${title} — ${author}` : title,
    description,
    textContent: parts.join("\n\n"),
    ogImageUrl: imageUrl,
    faviconUrl,
  };
}

/**
 * Try to extract a value from the DOM using a selector.
 * Supports comma-separated selectors (tries each in order).
 */
function extractField(
  selector: string | undefined,
  root: Element,
  attr: "textContent" | "src" | "content",
): string | undefined {
  if (!selector) return undefined;

  for (const sel of selector.split(",").map((s) => s.trim())) {
    // Check if it's a meta selector — search in document, not clone
    const isMeta = sel.startsWith("meta[");
    const searchRoot = isMeta ? document : root;
    const el = searchRoot.querySelector(sel);
    if (!el) continue;

    let value: string | null = null;
    if (attr === "textContent") {
      value = el.textContent;
    } else {
      value = el.getAttribute(attr) ?? el.getAttribute("content") ?? el.getAttribute("src");
    }

    if (value?.trim()) return value.trim();
  }

  return undefined;
}
