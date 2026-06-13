import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  plugins: [svelte({ prebundleSvelteLibraries: false })],
  server: {
    host: "0.0.0.0",
    proxy: { "/api": "http://localhost:3001" }
  },
  preview: { host: "0.0.0.0" },
  optimizeDeps: command === "serve"
    ? { disabled: "dev", noDiscovery: true }
    : { noDiscovery: true }
}));
