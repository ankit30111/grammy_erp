import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Served same-origin from the Frappe site at /grammy; assets under
// /assets/grammy_erp/frontend/. Stable entry filenames so www/grammy.html
// can reference index.js / index.css directly.
export default defineConfig(({ mode }) => ({
  base: "/assets/grammy_erp/frontend/",
  server: { host: "::", port: 8080 },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: {
        entryFileNames: "index.js",
        assetFileNames: (info) =>
          info.name && info.name.endsWith(".css") ? "index.css" : "assets/[name]-[hash][extname]",
        chunkFileNames: "assets/[name]-[hash].js",
      },
    },
  },
}));
