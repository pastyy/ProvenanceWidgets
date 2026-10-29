import { fileURLToPath, URL } from "node:url";

import react from "@vitejs/plugin-react";
import { build } from "esbuild";
import { defineConfig, transformWithOxc } from "vite";

const savgolSource = fileURLToPath(new URL("../vendor/js-savgol-filter/js-savgol-filter.js", import.meta.url));
const vendorCommonJs = {
  name: "provenance-vendor-commonjs",
  apply: "serve",
  async transform(_code, id) {
    if (id.replaceAll("\\", "/") !== savgolSource.replaceAll("\\", "/")) return null;
    // Local CommonJS files are source modules, so dependency optimization alone
    // does not rewrite their relative imports in development.
    const result = await build({
      entryPoints: [savgolSource], bundle: true, write: false,
      format: "esm", platform: "browser", sourcemap: "inline",
    });
    return { code: result.outputFiles[0].text, map: null };
  },
};

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
    vendorCommonJs,
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
