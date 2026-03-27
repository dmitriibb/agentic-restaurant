import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const appNodeModules = path.resolve(__dirname, "node_modules");

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      react: path.resolve(appNodeModules, "react"),
      "react-dom": path.resolve(appNodeModules, "react-dom"),
      "@mui/material": path.resolve(appNodeModules, "@mui/material"),
      "@mui/icons-material": path.resolve(appNodeModules, "@mui/icons-material"),
      "@emotion/react": path.resolve(appNodeModules, "@emotion/react"),
      "@emotion/styled": path.resolve(appNodeModules, "@emotion/styled"),
      "@fontsource/manrope": path.resolve(appNodeModules, "@fontsource/manrope")
    },
    preserveSymlinks: true,
    dedupe: ["react", "react-dom"]
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    globals: true,
    server: {
      deps: {
        inline: ["@agentic-restaurant/ui-common-libs", /^@mui\//, /^@emotion\//, /^@fontsource\//]
      }
    }
  }
});
