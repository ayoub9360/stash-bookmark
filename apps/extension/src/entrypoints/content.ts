import { extractPageContent } from "../lib/extractors";
import { userRules } from "../lib/storage";

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_idle",
  main() {
    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.type === "EXTRACT_CONTENT") {
        (async () => {
          try {
            const rules = await userRules.getValue();
            const content = extractPageContent(rules);
            sendResponse({ success: true, content });
          } catch (err: any) {
            sendResponse({ success: false, error: err.message });
          }
        })();
        return true; // Keep channel open for async response
      }
    });
  },
});
