import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

// npm run build runs this twice (see package.json) to produce both a
// readable and a minified build, matching webflow-datepicker's
// step-form.js / step-form.min.js pair.
const minify = process.env.MINIFY === "true";

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: false,
    minify: minify ? "esbuild" : false,
    lib: {
      entry: fileURLToPath(new URL("./src/step-form.ts", import.meta.url)),
      name: "StepForm",
      formats: ["iife"],
      fileName: () => (minify ? "step-form.min.js" : "step-form.js"),
    },
  },
});
