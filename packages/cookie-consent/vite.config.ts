import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

// pnpm build runs this twice (see package.json) to produce both a readable
// and a minified build: consent.js / consent.min.js
const minify = process.env.MINIFY === "true";

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: false,
    minify: minify ? "esbuild" : false,
    lib: {
      entry: fileURLToPath(new URL("./src/consent.ts", import.meta.url)),
      name: "FiveConsentLib",
      formats: ["iife"],
      fileName: () => (minify ? "consent.min.js" : "consent.js"),
    },
  },
});
