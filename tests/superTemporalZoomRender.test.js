import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const result = await build({
    entryPoints: [fileURLToPath(new URL("../src/shared/components/SuperTemporalView.js", import.meta.url))],
    bundle: true, write: false, format: "esm", platform: "node",
    loader: { ".js": "jsx" }, jsx: "automatic",
    plugins: [{ name: "shared-react", setup(builder) {
        builder.onResolve({ filter: /^react(?:\/.*)?$/ }, args => ({
            path: import.meta.resolve(args.path), external: true,
        }));
    } }],
});
const SuperTemporalView = (await import("data:text/javascript;base64," + Buffer.from(result.outputFiles[0].text).toString("base64"))).default;
const props = {
    id: "super-test", widgetIds: ["slider", "checkbox"], onRestore: () => {},
    interactions: ["slider", "checkbox", "slider", "checkbox"].map((widgetId, index) => ({
        widgetId, index, color: "orange", time: new Date(1000 * index),
    })),
};
const render = overrides => renderToStaticMarkup(createElement(SuperTemporalView, { ...props, ...overrides }));

test("SuperProvenance renders the shared draggable brush, aligned rows and no legacy arrow", () => {
    const html = render();
    assert.match(html, /data-provenance-temporal-brush="super-test"/);
    assert.match(html, /Drag horizontally to zoom SuperProvenance history/);
    assert.equal((html.match(/data-provenance-super-interaction=/g) ?? []).length, 4);
    assert.equal((html.match(/data-provenance-super-track=/g) ?? []).length, 2);
    assert.match(html, /left:25%;width:25%/);
    assert.doesNotMatch(html, /sequence of interactions|border-left:8px solid #333/);
});

test("SuperProvenance hides disabled and threshold-gated brushes without hiding history", () => {
    for (const overrides of [
        { temporalBrush: false },
        { scalability: { temporal_view: { strategy: "clipping" } } },
        { scalability: { temporal_view: { zoom_in_options: { visibility: "off" } } } },
        { scalability: { temporal_view: { zoom_in_options: { modes: ["values"] } } } },
        { scalability: { temporal_view: { zoom_in_options: { visibility: "after-trigger" } } } },
    ]) {
        const html = render(overrides);
        assert.doesNotMatch(html, /data-provenance-temporal-brush/);
        assert.equal((html.match(/data-provenance-super-interaction=/g) ?? []).length, 4);
    }
});

test("SuperProvenance renders empty and single-interaction histories without a brush", () => {
    for (const interactions of [[], props.interactions.slice(0, 1)]) {
        const html = render({ interactions });
        assert.doesNotMatch(html, /data-provenance-temporal-brush|NaN|Infinity/);
        assert.equal((html.match(/data-provenance-super-track=/g) ?? []).length, 2);
    }
});
