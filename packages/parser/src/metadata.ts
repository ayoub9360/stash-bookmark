interface ExtractedMetadata {
  title: string | null;
  description: string | null;
  favicon_url: string | null;
  og_image_url: string | null;
  language: string | null;
  published_at: string | null;
}

export function extractMetadata(document: Document, baseUrl: string): ExtractedMetadata {
  const getMetaContent = (name: string): string | null => {
    const el =
      document.querySelector(`meta[property="${name}"]`) ??
      document.querySelector(`meta[name="${name}"]`);
    return el?.getAttribute("content") ?? null;
  };

  // Title
  const title =
    getMetaContent("og:title") ??
    document.querySelector("title")?.textContent ??
    null;

  // Description
  const description =
    getMetaContent("og:description") ??
    getMetaContent("description") ??
    null;

  // Favicon
  let favicon_url: string | null = null;
  const iconLink =
    document.querySelector('link[rel="icon"]') ??
    document.querySelector('link[rel="shortcut icon"]');
  if (iconLink) {
    const href = iconLink.getAttribute("href");
    if (href) {
      try {
        favicon_url = new URL(href, baseUrl).href;
      } catch {
        favicon_url = null;
      }
    }
  }
  if (!favicon_url) {
    try {
      favicon_url = new URL("/favicon.ico", baseUrl).href;
    } catch {
      favicon_url = null;
    }
  }

  // OG Image — resolve relative URLs to absolute
  let og_image_url: string | null = null;
  const rawOgImage = getMetaContent("og:image") ?? getMetaContent("twitter:image") ?? null;
  if (rawOgImage) {
    try {
      og_image_url = new URL(rawOgImage, baseUrl).href;
    } catch {
      og_image_url = null;
    }
  }

  // Language
  const language =
    document.documentElement.getAttribute("lang") ??
    getMetaContent("language") ??
    null;

  // Published date
  const published_at =
    getMetaContent("article:published_time") ??
    getMetaContent("datePublished") ??
    getMetaContent("date") ??
    null;

  return { title, description, favicon_url, og_image_url, language, published_at };
}
