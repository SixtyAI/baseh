import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  base: "/baseh/",
  resolve: {
    alias: {
      "@sixtyai/baseh": resolve(__dirname, "../js/src/index.ts")
    }
  },
  build: {
    rollupOptions: {
      input: {
        calculator: resolve(__dirname, "index.html"),
        designer: resolve(__dirname, "designer.html")
      }
    },
    outDir: "dist"
  }
});
