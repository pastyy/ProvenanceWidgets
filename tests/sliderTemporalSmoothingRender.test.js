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
    assert.match(single, /data-provenance-temporal-best-fit="value"/);
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
    assert.match(range, /data-provenance-temporal-best-fit="low"/);
    assert.match(range, /data-provenance-temporal-best-fit="high"/);
    assert.equal((range.match(/<line\s/g) ?? []).length, 2);
    assert.equal((range.match(/<path/g) ?? []).length, 2);
    assert.doesNotMatch(range, /NaN|Infinity/);
});

const renderBestFit = (samples, props = {}) => renderToStaticMarkup(
    createElement("svg", null, createElement(SliderTemporalSmoothingCurve, {
        samples, min: 0, max: 10, width: 300, height: 250, ...props,
    }))
);

const bestFitCoordinates = (markup, field = "value") => {
    const element = markup.match(new RegExp(`<line data-provenance-temporal-best-fit="${field}"[^>]*>`))?.[0];
    assert.ok(element);
    return ["x1", "y1", "x2", "y2"].map(attribute =>
        Number(element.match(new RegExp(`${attribute}="([^"]+)"`))[1]));
};

test("best fit uses least squares over all temporal samples for every smoothing method", () => {
    const samples = [
        { offset: 0, value: 1 },
        { offset: 0.5, value: 8 },
        { offset: 1, value: 3 },
    ];
    const before = structuredClone(samples);
    for (const method of ["savgol", "gaussian", "bspline"]) {
        const markup = renderBestFit(samples, { method });
        const coordinates = bestFitCoordinates(markup);
        const expected = [90, 8, 150, 242];
        coordinates.forEach((coordinate, index) =>
            assert.ok(Math.abs(coordinate - expected[index]) < 1e-9));
        assert.match(markup, /stroke-dasharray="6 4"/);
    }
    assert.deepEqual(samples, before);
});

test("best fit follows temporal offsets rather than sample indices", () => {
    const markup = renderBestFit([
        { offset: 0, value: 1 },
        { offset: 0.25, value: 3 },
        { offset: 1, value: 9 },
    ]);
    const expected = [30, 8, 270, 242];
    bestFitCoordinates(markup).forEach((coordinate, index) =>
        assert.ok(Math.abs(coordinate - expected[index]) < 1e-9));
});

test("range best fit computes independent low and high trends", () => {
    const markup = renderBestFit([
        { offset: 0, low: 1, high: 9 },
        { offset: 0.5, low: 2, high: 8 },
        { offset: 1, low: 3, high: 7 },
    ], { range: true });
    assert.deepEqual(bestFitCoordinates(markup, "low"), [30, 8, 90, 242]);
    assert.deepEqual(bestFitCoordinates(markup, "high"), [270, 8, 210, 242]);
});

test("constant values have a valid best fit and degenerate histories omit it", () => {
    assert.deepEqual(bestFitCoordinates(renderBestFit([
        { offset: 0, value: 4 }, { offset: 1, value: 4 },
    ])), [120, 8, 120, 242]);
    for (const samples of [[], [{ offset: 0, value: 4 }], [
        { offset: 0.5, value: 2 }, { offset: 0.5, value: 8 },
    ]]) {
        const markup = renderBestFit(samples);
        assert.doesNotMatch(markup, /data-provenance-temporal-best-fit=/);
        assert.doesNotMatch(markup, /NaN|Infinity/);
    }
});

test("best fit is clipped to the temporal plot without altering its slope", () => {
    const markup = renderBestFit([
        { offset: 0, value: 0 },
        { offset: 0.5, value: 10 },
        { offset: 1, value: 10 },
    ], { gradientKey: "best-fit-test" });
    const coordinates = bestFitCoordinates(markup);
    assert.ok(coordinates[2] > 300);
    assert.match(markup, /<clipPath id="slider-temporal-smoothing-gradient-best-fit-test-best-fit-clip">/);
    assert.match(markup, /<rect x="0" y="8" width="300" height="234"/);
    assert.match(markup, /clip-path="url\(#slider-temporal-smoothing-gradient-best-fit-test-best-fit-clip\)"/);
});
