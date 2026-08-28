import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/democratic-party-crosscurrents/",
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: true,
    chunkSizeWarningLimit: 650,
  },
});
