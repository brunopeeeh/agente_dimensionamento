import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Configuração do Vitest separada da do Vite.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
