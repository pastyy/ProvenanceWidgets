import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NumericProvenance, RangedProvenance } from "@provenance-widgets/core";
import { resolveSliderAggregateSmoothing } from "../src/shared/logic/scalability/index.js";

// Compile the repository's JSX in memory; do not depend on generated dist files.
async function loadComponent(relativePath) {
    const result = await build({
        entryPoints: [fileURLToPath(new URL(relativePath, import.meta.url))],
        bundle: true, write: false, format: "esm", platform: "node",
        loader: { ".js": "jsx" }, jsx: "automatic",
    });
    return (await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`)).default;
}

const SingleSliderBars = await loadComponent("../src/shared/components/SingleSliderBars.js");
const RangeSliderBars = await loadComponent("../src/shared/components/RangeSliderBars.js");

test("all methods replace bars and hitboxes only after smoothing is triggered", () => {
    for (const kind of ["single", "range"]) {
        const provenance = kind === "single" ? new NumericProvenance(0, 20) : new RangedProvenance(0, 20);
        const values = kind === "single" ? [5, 10, 10] : [[2, 8], [5, 15], [5, 15]];
        values.forEach(value => provenance.insert(value));
        const records = values.map(value => ({ value, kind: "interaction" }));
        const recencyColor = value => `rgb(${Math.round(value * 255)},0,0)`;
        const props = {
            provenance, min: 0, max: 20, width: 320, height: 50,
            barKeys: Array.from({ length: 21 }, (_, index) => index),
            barWidth: 8, orientationScheme: recencyColor, colorScheme: recencyColor,
            onRangeSelect: () => {},
            smoothingGradientKey: `${kind}-test`,
        };
        const Component = kind === "single" ? SingleSliderBars : RangeSliderBars;
        const render = extra => renderToStaticMarkup(createElement(Component, { ...props, ...extra }));
        const barsOnly = render();
        for (const type of ["savgol", "gaussian", "bspline"]) {
            const scalability = { aggregate_view: { strategy: "smoothing",
                smoothing_options: { method: { type, options: {} }, trigger: { threshold: 1 } } } };
            const samples = resolveSliderAggregateSmoothing({
                scalability, provenance, records, kind, min: 0, max: 20,
            });
            const markup = render({ smoothingSamples: samples, smoothingMethod: type });
            assert.match(markup, new RegExp(`data-provenance-smoothing="${type}"`));
            assert.match(markup, new RegExp(`data-provenance-smoothing-gradient="${type}"`));
            assert.match(markup, new RegExp(`data-provenance-smoothing-fill="${type}"`));
            assert.match(markup, new RegExp(`fill="url\\(#slider-smoothing-gradient-${kind}-test\\)"`));
            assert.match(markup, /pointer-events="none" aria-hidden="true"/);
            assert.doesNotMatch(markup, /NaN|Infinity/);
            assert.doesNotMatch(markup, /<rect\b/);
            assert.doesNotMatch(markup, /data-provenance-aggregate-range=/);
            const stops = [...markup.matchAll(/<stop offset="([^"]+)" stop-color="([^"]+)"/g)];
            assert.ok(stops.length >= 2);
            assert.ok(new Set(stops.map(([, , color]) => color)).size > 1);
            const offsets = stops.map(([, offset]) => Number.parseFloat(offset));
            assert.deepEqual(offsets, [...offsets].sort((a, b) => a - b));
            assert.ok(offsets.every(offset => offset >= 0 && offset <= 100));
            const gated = resolveSliderAggregateSmoothing({
                scalability: { aggregate_view: { ...scalability.aggregate_view,
                    smoothing_options: { method: { type, options: {} }, trigger: { threshold: 4 } } } },
                provenance, records, kind, min: 0, max: 20,
            });
            assert.equal(gated.length, 0);
            const gatedMarkup = render({ smoothingSamples: gated, smoothingMethod: type });
            assert.equal(gatedMarkup, barsOnly);
            assert.doesNotMatch(gatedMarkup, /data-provenance-smoothing-gradient=/);
            assert.match(gatedMarkup, /<rect\b/);
        }
    }
});
