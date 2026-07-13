import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const appRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  resolve: {
    alias: [
      {
        find: "@auraone/aura-ide-kit/styles.css",
        replacement: resolve(appRoot, "packages/aura-ide-kit/src/styles.css"),
      },
      {
        find: "@auraone/proofline-oss/styles.css",
        replacement: resolve(appRoot, "packages/proofline-oss/src/styles.css"),
      },
      {
        find: "@auraone/proofline-oss/tokens.css",
        replacement: resolve(appRoot, "packages/proofline-oss/src/tokens.css"),
      },
      {
        find: /^@auraone\/platform-contracts$/,
        replacement: resolve(appRoot, "packages/platform-contracts/src/index.ts"),
      },
      {
        find: /^@auraone\/aura-ide-kit$/,
        replacement: resolve(appRoot, "packages/aura-ide-kit/src/index.ts"),
      },
      {
        find: /^@auraone\/proofline-oss$/,
        replacement: resolve(appRoot, "packages/proofline-oss/src/index.ts"),
      },
    ],
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    include: ["@tauri-apps/api/core"],
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: false,
  },
  build: {
    target: "es2022",
    sourcemap: true,
  },
});
