import type { ExtractedContent } from "./types";
import type { SiteRule } from "./rules/types";
import { defaultRules, findMatchingRule, applyRule } from "./rules";
import { extractGeneric } from "./generic";

/**
 * Extract content from the current page.
 *
 * Pipeline:
 * 1. Try matching a rule (user rules first, then built-in)
 * 2. If no rule matches, fall back to generic extraction
 */
export function extractPageContent(customRules: SiteRule[] = []): ExtractedContent {
  const url = window.location.href;

  // Try rules-based extraction
  const rule = findMatchingRule(url, customRules, defaultRules);
  if (rule) {
    try {
      const result = applyRule(rule);
      // Only use rule result if we got meaningful content
      if (result.textContent && result.textContent.trim().length > 10) {
        return result;
      }
    } catch (err) {
      console.warn(`[Stash] Rule "${rule.name}" failed, falling back to generic:`, err);
    }
  }

  // Fallback to generic extraction
  return extractGeneric();
}

export type { ExtractedContent };
