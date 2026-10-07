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
  tanstackStart: {
    // Keep your existing server entry.
    server: {
      entry: "server",
    },

    // Generate static HTML so GitHub Pages can host the application.
    prerender: {
      enabled: true,
      crawlLinks: true,
      failOnError: true,
      autoSubfolderIndex: true,
    },
  },
});
