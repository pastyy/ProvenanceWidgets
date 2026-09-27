import { fileURLToPath, URL } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig, transformWithOxc } from "vite";

const sourceJsAsJsx = {
  name: "provenance-source-js-as-jsx",
  enforce: "pre",
  transform(code, id) {
    if (!id.includes("/src/") || !id.endsWith(".js")) return null;

    return transformWithOxc(code, id, {
      lang: "jsx",
      jsx: { runtime: "automatic" },
    });
  },
};

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [
    sourceJsAsJsx,
    react({
      include: /\.[jt]sx?$/,
    }),
  ],
  optimizeDeps: {
    // Vite's dependency scanner runs before plugins and cannot parse JSX in
    // this repository's .js source files. Normal transforms handle them.
    noDiscovery: true,
    include: [
      "classnames",
      "prop-types",
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
    ],
  },
  server: {
    open: false,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
