import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// Builds the SPA straight into the Apache docroot (../public). Dev proxies the
// API to the local FastAPI service.
export default defineConfig({
  plugins: [svelte()],
  publicDir: "static",
  build: { outDir: "../public", emptyOutDir: true, target: "es2020" },
  server: { proxy: { "/api": { target: "http://127.0.0.1:3490", changeOrigin: true } } },
});
