
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const isGitHubPages = process.env["GITHUB_PAGES"] === "1";

export default defineConfig({
  vite: {
    // GitHub Pages hosts this project under /sonoma-hub/
    base: isGitHubPages ? "/sonoma-hub/" : "/",
  },

  tanstackStart: {
    server: {
      entry: "server",
    },

    prerender: {
      enabled: isGitHubPages,
      crawlLinks: true,
      autoSubfolderIndex: true,
      failOnError: true,
    },
  },
});