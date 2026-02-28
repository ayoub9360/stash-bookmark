import { defineConfig } from "wxt";

export default defineConfig({
  srcDir: "src",
  outDir: "output",
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "Stash - AI Bookmark Manager",
    description: "Save bookmarks to your self-hosted Stash instance with AI-powered categorization",
    icons: {
      16: "icon-16.png",
      32: "icon-32.png",
      48: "icon-48.png",
      128: "icon-128.png",
    },
    permissions: ["activeTab", "storage"],
    commands: {
      "save-bookmark": {
        suggested_key: {
          default: "Ctrl+Shift+S",
          mac: "Command+Shift+S",
        },
        description: "Save current page as bookmark",
      },
    },
  },
});
