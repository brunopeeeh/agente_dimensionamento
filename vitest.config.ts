import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Kept separate from vite.config.ts because the app's Vite config wraps
// @lovable.dev/vite-tanstack-config (TanStack Start SSR plugins, Cloudflare
// nitro target, etc.) which isn't meant to run under Vitest's environment.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
