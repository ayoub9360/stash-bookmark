import { api } from "../lib/api";
import { serverUrl, apiToken } from "../lib/storage";
import type { ExtractedContent } from "../lib/extractors";

export default defineBackground(() => {
  // Handle keyboard shortcut
  browser.commands.onCommand.addListener(async (command) => {
    if (command === "save-bookmark") {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id || !tab.url) return;

      try {
        const response = await browser.tabs.sendMessage(tab.id, { type: "EXTRACT_CONTENT" });
        if (response?.success) {
          await api.createBookmark({
            url: tab.url,
            content: response.content,
          });
          // Show badge
          await browser.action.setBadgeText({ text: "✓", tabId: tab.id });
          await browser.action.setBadgeBackgroundColor({ color: "#22c55e", tabId: tab.id });
          setTimeout(() => {
            browser.action.setBadgeText({ text: "", tabId: tab.id });
          }, 2000);
        }
      } catch (err) {
        console.error("Quick save failed:", err);
        await browser.action.setBadgeText({ text: "!", tabId: tab.id });
        await browser.action.setBadgeBackgroundColor({ color: "#ef4444", tabId: tab.id });
        setTimeout(() => {
          browser.action.setBadgeText({ text: "", tabId: tab.id });
        }, 2000);
      }
    }
  });

  // Handle messages from popup
  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "SAVE_BOOKMARK") {
      handleSaveBookmark(message.data)
        .then((result) => sendResponse({ success: true, data: result }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true;
    }

    if (message.type === "GET_RECENT") {
      api
        .listBookmarks(5)
        .then((result) => sendResponse({ success: true, data: result }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true;
    }

    if (message.type === "GET_CONFIG_STATUS") {
      getConfigStatus()
        .then((result) => sendResponse(result))
        .catch(() => sendResponse({ configured: false }));
      return true;
    }
  });
});

async function handleSaveBookmark(data: {
  url: string;
  tags?: string[];
  content?: ExtractedContent;
}) {
  return api.createBookmark({
    url: data.url,
    tags: data.tags,
    content: data.content,
  });
}

async function getConfigStatus() {
  const [url, token] = await Promise.all([serverUrl.getValue(), apiToken.getValue()]);
  return { configured: !!url && !!token };
}
