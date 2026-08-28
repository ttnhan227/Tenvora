import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 5173,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("recharts") || id.includes("d3-") || id.includes("victory-vendor")) {
              return "charts";
            }
            if (id.includes("@radix-ui") || id.includes("cmdk") || id.includes("vaul") || id.includes("embla-carousel")) {
              return "radix-ui";
            }
            if (id.includes("lucide-react")) {
              return "lucide-icons";
            }
            if (
              id.includes("react-markdown") ||
              id.includes("remark-") ||
              id.includes("micromark") ||
              id.includes("unified") ||
              id.includes("unist-") ||
              id.includes("mdast-")
            ) {
              return "markdown";
            }
            if (id.includes("react-dom") || id.includes("react-router-dom") || id.includes("@tanstack")) {
              return "vendor";
            }
          }
        },
      },
    },
  },
}));
