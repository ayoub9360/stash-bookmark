import sanitizeHtml from "sanitize-html";

/**
 * Sanitize HTML content for safe storage and rendering.
 * Allows basic formatting tags but strips scripts, event handlers, etc.
 */
export function sanitize(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      "img",
      "figure",
      "figcaption",
      "picture",
      "source",
      "video",
      "audio",
      "details",
      "summary",
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ["src", "alt", "title", "width", "height", "loading"],
      source: ["src", "srcset", "type", "media"],
      video: ["src", "controls", "width", "height"],
      audio: ["src", "controls"],
      a: ["href", "title", "target", "rel"],
    },
    allowedSchemes: ["http", "https", "data"],
    // Strip all JS event handlers (onclick, onerror, etc.)
    disallowedTagsMode: "discard",
  });
}
