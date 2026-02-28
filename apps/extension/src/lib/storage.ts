import { storage } from "wxt/storage";
import type { SiteRule } from "./extractors/rules/types";

export const serverUrl = storage.defineItem<string>("sync:serverUrl", {
  fallback: "http://localhost:3000",
});

export const apiToken = storage.defineItem<string>("sync:apiToken", {
  fallback: "",
});

export const userRules = storage.defineItem<SiteRule[]>("sync:userRules", {
  fallback: [],
});
