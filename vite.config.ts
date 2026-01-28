import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      $particles: fileURLToPath(new URL("./src/core", import.meta.url)),
    },
  },
});
