import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const appNodeModules = path.resolve(__dirname, "node_modules");
const workspaceNodeModules = path.resolve(__dirname, "../../node_modules");
const resolvedNodeModules = fs.existsSync(appNodeModules) ? appNodeModules : workspaceNodeModules;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      react: path.resolve(resolvedNodeModules, "react"),
      "react-dom": path.resolve(resolvedNodeModules, "react-dom"),
      "@mui/material": path.resolve(resolvedNodeModules, "@mui/material"),
      "@mui/icons-material": path.resolve(resolvedNodeModules, "@mui/icons-material"),
      "@emotion/react": path.resolve(resolvedNodeModules, "@emotion/react"),
      "@emotion/styled": path.resolve(resolvedNodeModules, "@emotion/styled"),
      "@fontsource/manrope": path.resolve(resolvedNodeModules, "@fontsource/manrope")
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
