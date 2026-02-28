export interface SiteRule {
  /** Human-readable name */
  name: string;
  /** URL glob patterns to match (e.g. "x.com/*/status/*") */
  match: string[];
  /** CSS selector to scope extraction to a DOM subtree */
  scope?: string;
  /** CSS selectors for elements to remove before extraction */
  exclude?: string[];
  /** Targeted selectors for specific fields */
  selectors?: {
    title?: string;
    author?: string;
    content?: string;
    image?: string;
  };
  /** Whether this is a built-in rule (cannot be deleted, only overridden) */
  builtin?: boolean;
  /** Whether this rule is enabled */
  enabled?: boolean;
}
