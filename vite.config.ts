// @lovable.dev/vite-tanstack-config already includes:
// - TanStack devtools
// - tanstackStart
// - viteReact
// - tailwindcss
// - tsConfigPaths
// - nitro
// - VITE_* env injection
// - @ path alias
// - React/TanStack dedupe
// - error logger plugins
// - sandbox detection

import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  vite: {
    // GitHub Pages serves this repository under /sonoma-hub/
    base: process.env.GITHUB_PAGES === "1" ? "/sonoma-hub/" : "/",
  },

  tanstackStart: {
    server: {
      entry: "server",
    },

    prerender: {
      enabled: process.env.GITHUB_PAGES === "1",
      crawlLinks: true,
      autoSubfolderIndex: true,
      failOnError: true,
    },
  },
});
