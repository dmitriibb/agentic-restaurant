import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const appNodeModules = path.resolve(__dirname, "node_modules");
const workspaceNodeModules = path.resolve(__dirname, "../../node_modules");
const uiCommonLibsSource = path.resolve(__dirname, "../ui-common-libs/src/index.ts");
const resolvedNodeModules = fs.existsSync(path.resolve(appNodeModules, "react/package.json"))
  ? appNodeModules
  : workspaceNodeModules;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: "@agentic-restaurant/ui-common-libs", replacement: uiCommonLibsSource },
      { find: "react/jsx-runtime", replacement: path.resolve(resolvedNodeModules, "react/jsx-runtime.js") },
      { find: "react/jsx-dev-runtime", replacement: path.resolve(resolvedNodeModules, "react/jsx-dev-runtime.js") },
      { find: "react", replacement: path.resolve(resolvedNodeModules, "react") },
      { find: "react-dom", replacement: path.resolve(resolvedNodeModules, "react-dom") },
      { find: "@mui/material", replacement: path.resolve(resolvedNodeModules, "@mui/material") },
      { find: "@mui/icons-material", replacement: path.resolve(resolvedNodeModules, "@mui/icons-material") },
      { find: "@emotion/react", replacement: path.resolve(resolvedNodeModules, "@emotion/react") },
      { find: "@emotion/styled", replacement: path.resolve(resolvedNodeModules, "@emotion/styled") },
      { find: "@fontsource/manrope", replacement: path.resolve(resolvedNodeModules, "@fontsource/manrope") }
    ],
    preserveSymlinks: true,
    dedupe: ["react", "react-dom"]
  },
  server: {
    fs: {
      allow: [path.resolve(__dirname, "..")]
    }
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
