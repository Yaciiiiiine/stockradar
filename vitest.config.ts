import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": resolve(__dirname, ".") },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Figées pour que les snapshots ne dépendent pas de l'environnement local.
    env: {
      NEXT_PUBLIC_APP_URL: "https://stockradar.test",
      STOCK_API_KEY: "test-key",
    },
  },
});
