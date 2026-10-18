import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

async function loadComponent(relativePath) {
    const result = await build({
        entryPoints: [fileURLToPath(new URL(relativePath, import.meta.url))],
        bundle: true,
        write: false,
        format: "esm",
        platform: "node",
        loader: { ".js": "jsx" },
        jsx: "automatic",
    });
    return (await import(
        `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`
    )).default;
}

const SliderTemporalSmoothingCurve = await loadComponent(
    "../src/shared/components/SliderTemporalSmoothingCurve.js"
);

test("temporal smoothing renders distinct non-interactive single and range paths", () => {
    const base = {
        method: "gaussian",
        min: 0,
        max: 10,
        width: 300,
        height: 250,
        recencyStops: [
            { offset: 0, color: "rgb(255, 200, 100)" },
            { offset: 1, color: "rgb(200, 50, 0)" },
        ],
        gradientKey: "temporal-test",
    };
    const single = renderToStaticMarkup(createElement("svg", null,
        createElement(SliderTemporalSmoothingCurve, {
            ...base,
            samples: [
                { offset: 0, value: 1 },
                { offset: 0.5, value: 8 },
                { offset: 1, value: 3 },
            ],
        })));
    assert.match(single, /data-provenance-temporal-smoothing="gaussian"/);
    assert.match(single, /data-provenance-temporal-smoothing-path="value"/);
    assert.match(single, /data-provenance-temporal-smoothing-gradient="gaussian"/);
    assert.match(single, /pointer-events="none" aria-hidden="true"/);
    assert.doesNotMatch(single, /data-provenance-smoothing-fill=/);
    assert.doesNotMatch(single, /NaN|Infinity/);

    const range = renderToStaticMarkup(createElement("svg", null,
        createElement(SliderTemporalSmoothingCurve, {
            ...base,
            range: true,
            samples: [
                { offset: 0, low: 1, high: 5 },
                { offset: 0.5, low: 2, high: 8 },
                { offset: 1, low: 4, high: 9 },
            ],
        })));
    assert.match(range, /data-provenance-temporal-smoothing-path="low"/);
    assert.match(range, /data-provenance-temporal-smoothing-path="high"/);
    assert.equal((range.match(/<path/g) ?? []).length, 2);
    assert.doesNotMatch(range, /NaN|Infinity/);
});
