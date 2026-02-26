export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function estimateReadingTime(text: string): number {
  const wordsPerMinute = 200;
  const wordCount = text.split(/\s+/).length;
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
}

export function isNaturalLanguageQuery(query: string): boolean {
  const naturalIndicators = [
    /\b(what|where|how|when|which|who|find|show|get|search|about|related|similar)\b/i,
    /\b(the|that|this|those|these|my|i|me)\b/i,
    /\s{2,}/, // multiple words
  ];
  const words = query.trim().split(/\s+/);
  if (words.length >= 4) return true;
  return naturalIndicators.some((pattern) => pattern.test(query));
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}
