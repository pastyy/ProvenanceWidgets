import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const chartPath = fileURLToPath(new URL("../src/widgets/Chart.js", import.meta.url));
const result = await build({
    stdin: {
        contents: `export { default } from ${JSON.stringify(chartPath)};
            export { default as ProvenanceContext } from "./src/provenance/ProvenanceContext.js";
            export { setRange } from "chart-react";`,
        resolveDir: fileURLToPath(new URL("..", import.meta.url)),
    },
    bundle: true, write: false, format: "esm", platform: "node",
    loader: { ".js": "jsx" }, jsx: "automatic",
    plugins: [{ name: "chart-state", setup(builder) {
        builder.onResolve({ filter: /^chart-react$/ }, () => ({
            path: "chart-react", namespace: "stub",
        }));
        builder.onResolve({ filter: /^react$/ }, args => args.importer === chartPath
            ? { path: "chart-react", namespace: "stub" }
            : { path: import.meta.resolve(args.path), external: true });
        builder.onResolve({ filter: /^react[/]/ }, args => ({
            path: import.meta.resolve(args.path), external: true,
        }));
        builder.onLoad({ filter: /.*/, namespace: "stub" }, () => ({
            contents: `
                import { useState as state } from "react";
                export { useCallback, useEffect, useRef, useMemo } from "react";
                let range = null;
                export const setRange = value => { range = value; };
                export const useState = initial => state(initial === null ? range : initial);
            `,
            loader: "js",
        }));
    } }],
});
const { default: Chart, ProvenanceContext, setRange } = await import(
    "data:text/javascript;base64," + Buffer.from(result.outputFiles[0].text).toString("base64")
);
const records = Array.from({ length: 9 }, (_, index) => [index + 1, {
    index: index + 1,
    value: index === 0 ? "" : `search-${index}`,
    time: new Date(index * 2000),
    kind: index === 0 ? "baseline" : "interaction",
}]);
const render = (props = {}, range = null) => {
    setRange(range);
    return renderToStaticMarkup(createElement(ProvenanceContext.Provider, {
        value: {
            tooltipId: "test-tooltip",
            state: { registeredComponents: new Map() },
            actions: { restoreWidgetValue: () => false },
        },
    }, createElement(Chart, {
        target: "text-test", theme: "light", widgetWidth: 320,
        provenanceStrategy: { detailedData: new Map(records), tooltipIndexOffset: 1 },
        ...props,
    })));
};
const zoom = options => ({ temporal_view: { strategy: "zoom_in", zoom_in_options: options } });
const valueCount = markup => (markup.match(/data-provenance-temporal-value=/g) ?? []).length;

test("InputText retains its history axis independently of zoom tool visibility", () => {
    for (const props of [
        { temporalBrush: false },
        { scalability: zoom({ visibility: "off" }) },
        { scalability: zoom({ modes: ["values", "interactions-values"] }) },
        { scalability: zoom({ visibility: "after-trigger", trigger: { threshold: 10 } }) },
    ]) {
        const markup = render(props);
        assert.match(markup, /aria-label="Complete input-text interaction range"/);
        assert.match(markup, /data-provenance-temporal-brush="text-test"/);
        assert.doesNotMatch(markup, /Drag vertically to zoom|data-provenance-zoom-axis=/);
        assert.equal(valueCount(markup), records.length);
        assert.doesNotMatch(markup, /NaN|Infinity/);
    }
});

test("InputText enables the brush at the committed-interaction threshold", () => {
    const props = { scalability: zoom({ visibility: "after-trigger", trigger: { threshold: 8 } }) };
    const markup = render(props);
    assert.match(markup, /aria-label="Drag vertically to zoom input-text history"/);
    assert.equal(valueCount(markup), records.length);
    assert.doesNotMatch(markup, /data-provenance-zoom-axis=/);
});

test("InputText selected ranges filter rows and preserve zoom-axis layout when cleared", () => {
    for (const mode of ["interaction", "time"]) {
        const initial = render({ mode });
        const selected = render({ mode }, [2, 4]);
        const cleared = render({ mode });
        assert.equal(initial, cleared);
        assert.equal(valueCount(initial), records.length);
        assert.equal(valueCount(selected), 3);
        assert.match(selected, /data-provenance-temporal-value="search-2"/);
        assert.match(selected, /data-provenance-temporal-value="search-4"/);
        assert.doesNotMatch(selected, /data-provenance-temporal-value="search-[15]"/);
        assert.match(selected, /data-provenance-zoom-axis="interactions"/);
        assert.match(selected, mode === "time" ? /Selected time range/ : /Selected interaction range/);
        for (const markup of [initial, selected, cleared]) {
            assert.match(markup, /padding-right:28px/);
            assert.match(markup, /right:28px;height:24px/);
            assert.doesNotMatch(markup, /NaN|Infinity/);
        }
    }
});

test("InputText zoom tick positions and history-point centers agree", () => {
    const markup = render({}, [2, 4]);
    assert.match(markup, /y1="8" y2="8"/);
    assert.match(markup, /top:-4px;left:0;right:28px;height:24px/);
    assert.match(markup, /top:208px;left:0;right:28px;height:24px/);
    assert.match(markup, /top:420px;left:0;right:28px;height:24px/);
});

test("InputText clipping retains an absolute history axis without enabling zoom", () => {
    const markup = render({ scalability: {
        temporal_view: { strategy: "clipping", clipping_options: { trigger: { threshold: 3 } } },
    } });
    assert.match(markup, /aria-label="Complete input-text interaction range"/);
    assert.doesNotMatch(markup, /Drag vertically to zoom|data-provenance-zoom-axis=/);
    assert.equal(valueCount(markup), 3);
    assert.match(markup, /data-provenance-temporal-value="search-6"/);
    assert.match(markup, /data-provenance-temporal-value="search-7"/);
    assert.match(markup, /data-provenance-temporal-value="search-8"/);
    assert.match(markup, />7<\/text>/);
    assert.match(markup, />8<\/text>/);
});

test("text and slider zoom brushes keep only the compact native tooltip", () => {
    for (const props of [
        {},
        { provenanceStrategy: {
            detailedData: new Map(records.map(([key, record]) => [key, { ...record, value: key }])),
            minValue: 0, maxValue: 10,
        } },
    ]) {
        const markup = render(props);
        assert.match(markup, /data-provenance-tooltip-content=/);
        assert.doesNotMatch(markup, /data-provenance-tooltip-content="(?:Drag |Complete )/);
        assert.doesNotMatch(markup, /data-tooltip-content="(?:Drag |Complete )/);
        assert.match(markup, /<title>Drag vertically to zoom; clear the selection to reset<\/title>/);
        if (props.provenanceStrategy) {
            assert.match(markup, /<title>Drag horizontally to zoom values; clear the selection to reset<\/title>/);
        }
    }
});
