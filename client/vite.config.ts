import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// `--mode demo` builds a single self-contained HTML file with no backend (guest mode only),
// which is what gets published as the live Stride page.
export default defineConfig(({ mode }) => ({
  plugins: mode === "demo" ? [react(), viteSingleFile()] : [react()],
  build: mode === "demo" ? { outDir: "../demo", emptyOutDir: true } : { outDir: "dist" },
  server: { port: 5173, proxy: { "/api": "http://localhost:3001" } },
}));
