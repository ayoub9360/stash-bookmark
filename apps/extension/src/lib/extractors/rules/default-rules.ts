import type { SiteRule } from "./types";

export const defaultRules: SiteRule[] = [
  {
    name: "Twitter/X — Single tweet",
    match: ["x.com/*/status/*", "twitter.com/*/status/*"],
    scope: "[data-testid='primaryColumn'] [data-testid='cellInnerDiv']:first-child",
    exclude: [
      "[data-testid='caret']",
      "[role='group']",
      "nav",
      "aside",
    ],
    selectors: {
      author: "[data-testid='User-Name']",
      content: "[data-testid='tweetText']",
      image: "[data-testid='tweetPhoto'] img",
    },
    builtin: true,
    enabled: true,
  },
  {
    name: "YouTube — Video page",
    match: ["youtube.com/watch*", "www.youtube.com/watch*"],
    scope: "#primary-inner, #columns #primary",
    exclude: [
      "#comments",
      "#related",
      "#secondary",
      "ytd-merch-shelf-renderer",
      "ytd-ad-slot-renderer",
    ],
    selectors: {
      title: "h1.ytd-watch-metadata yt-formatted-string, meta[name='title']",
      author: "ytd-channel-name yt-formatted-string a, #channel-name a",
      content: "#description-inline-expander .content, ytd-text-inline-expander #plain-snippet-text, meta[name='description']",
      image: "meta[property='og:image']",
    },
    builtin: true,
    enabled: true,
  },
  {
    name: "GitHub — Repository",
    match: ["github.com/*/*"],
    scope: "[data-turbo-body]",
    exclude: [
      "nav",
      ".AppHeader",
      ".UnderlineNav",
      "footer",
      "#discussion_bucket",
      ".pagehead-actions",
    ],
    selectors: {
      title: "[itemprop='name'] a, .js-repo-root strong a",
      content: "#readme .markdown-body, article.markdown-body",
      image: "meta[property='og:image']",
    },
    builtin: true,
    enabled: true,
  },
  {
    name: "Reddit — Post only",
    match: ["reddit.com/r/*/comments/*", "www.reddit.com/r/*/comments/*", "old.reddit.com/r/*/comments/*"],
    scope: "shreddit-post, .thing.link",
    exclude: [
      "#comment-tree",
      ".commentarea",
      "aside",
      ".sidebar",
    ],
    selectors: {
      title: "[slot='title'], [data-testid='post-title'], .title a",
      content: "[slot='text-body'], [data-testid='post-body'], .usertext-body",
      author: "[slot='credit-bar'] a, [data-testid='post-author'], .author",
      image: "meta[property='og:image']",
    },
    builtin: true,
    enabled: true,
  },
  {
    name: "Hacker News — Post only",
    match: ["news.ycombinator.com/item*"],
    scope: ".fatitem",
    exclude: [
      ".comment-tree",
      ".reply",
    ],
    selectors: {
      title: ".titleline a",
      content: ".toptext",
    },
    builtin: true,
    enabled: true,
  },
];
