import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const result = await build({
    entryPoints: [fileURLToPath(new URL("../src/shared/components/CheckboxZoomAxis.js", import.meta.url))],
    bundle: true, write: false, format: "esm", platform: "node",
    loader: { ".js": "jsx" }, jsx: "automatic",
    plugins: [{ name: "measured-axis", setup(builder) {
        builder.onResolve({ filter: /^react$/ }, args => args.importer.endsWith("CheckboxZoomAxis.js")
            ? { path: "measured-react", namespace: "stub" }
            : { path: import.meta.resolve(args.path), external: true });
        builder.onResolve({ filter: /^react[/]/ }, args => ({
            path: import.meta.resolve(args.path), external: true,
        }));
        builder.onLoad({ filter: /.*/, namespace: "stub" }, () => ({
            contents: `
                import { useState as state } from "react";
                export { useLayoutEffect, useRef } from "react";
                export const useState = initial => state({ ...initial, width: 320 });
            `,
            loader: "js",
        }));
    } }],
});
const CheckboxZoomAxis = (await import("data:text/javascript;base64," + Buffer.from(result.outputFiles[0].text).toString("base64"))).default;
const render = domain => renderToStaticMarkup(createElement(CheckboxZoomAxis, {
    id: "dropdown", elementRef: { current: null }, mode: "interaction", panel: true, domain,
}));

test("dropdown selected-range footer reserves identical space before selection and after clearing", () => {
    const initial = render(null);
    const selected = render([2, 8]);
    const cleared = render(null);
    const footer = /<div data-provenance-zoom-footer="dropdown"[^>]*>/;

    assert.match(initial, /height:36px;margin-top:6px/);
    assert.equal(initial.match(footer)[0], selected.match(footer)[0]);
    assert.equal(initial, cleared);
    assert.doesNotMatch(initial, /data-provenance-zoom-axis/);
    assert.match(selected, /data-provenance-zoom-axis="interactions"/);
    assert.doesNotMatch(initial + selected, /NaN|Infinity/);
});
