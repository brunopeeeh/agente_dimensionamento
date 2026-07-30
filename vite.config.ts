import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";

export default defineConfig({
  plugins: [
    tanstackStart({
      server: { entry: "server" },
    }),
    nitro({
      preset: "vercel",
    }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/xlsx") || id.includes("node_modules/cfb")) {
            return "xlsx";
          }
          if (
            id.includes("node_modules/recharts") ||
            id.includes("node_modules/victory-vendor") ||
            id.includes("node_modules/d3-")
          ) {
            return "recharts";
          }
        },
      },
    },
  },
});
