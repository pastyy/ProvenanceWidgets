import assert from "node:assert/strict";
import { test } from "node:test";
import { NumericProvenance, RangedProvenance } from "@provenance-widgets/core";
import {
    buildSliderAggregateSamples,
    hasSmoothingTriggered,
    resolveSmoothingConfig,
    resolveSliderAggregateSmoothing,
    smoothSavgol,
    smoothGaussian,
    smoothBspline,
} from "../src/shared/logic/scalability/index.js";

const method = (type = "savgol", options = {}) => ({ type, options });
const settings = (selectedMethod = method(), trigger = { threshold: 1 }) => ({
    aggregate_view: { strategy: "smoothing", smoothing_options: { method: selectedMethod, trigger } },
});
const history = values => values.map((value, index) => ({
    value, kind: "interaction", timestamp: new Date(index * 1000).toISOString(),
}));
const near = (actual, expected, tolerance = 1e-9) =>
    assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);

test("Savgol degree 3 reproduces quadratic signals", () => {
    const samples = Array.from({ length: 21 }, (_, value) => ({
        value: value / 2, count: 3 + 2 * value + value ** 2,
    }));
    const output = smoothSavgol(samples, { window_size: 9, degree: 3 });
    output.forEach((sample, index) => near(sample.count, samples[index].count));
    assert.notEqual(output[0], samples[0]);
});

test("Savgol uses the known five-point quadratic kernel, rather than a moving average", () => {
    const samples = Array.from({ length: 11 }, (_, value) => ({
        value, count: value === 5 ? 1 : 0,
    }));
    const output = smoothSavgol(samples, { window_size: 5, degree: 3 });
    [-3 / 35, 12 / 35, 17 / 35, 12 / 35, -3 / 35].forEach((weight, offset) =>
        near(output[offset + 3].count, weight));
});

test("Savgol window_size counts samples independently of data-domain spacing", () => {
    const samples = Array.from({ length: 21 }, (_, value) => ({
        value: value / 10, count: value === 10 ? 1 : 0,
    }));
    const output = smoothSavgol(samples, { window_size: 5, degree: 3 });
    near(output[10].count, 17 / 35);
    assert.deepEqual(output.map(sample => sample.value), samples.map(sample => sample.value));
    const scaled = smoothSavgol(samples.map(sample => ({ ...sample, value: sample.value * 100 })), { window_size: 5, degree: 3 });
    assert.deepEqual(scaled.map(sample => sample.count), output.map(sample => sample.count));
});

test("Savgol retains short histories and rejects invalid windows without resizing", () => {
    const samples = [{ value: 0, count: 2 }, { value: 1, count: 5 }];
    assert.deepEqual(smoothSavgol(samples), samples);
    assert.deepEqual(smoothSavgol([]), []);
    const larger = Array.from({ length: 11 }, (_, value) => ({ value, count: value === 5 ? 1 : 0 }));
    near(smoothSavgol(larger)[5].count, 17 / 35);
    for (const method of [
        { window_size: 13, degree: 3 }, { window_size: 3, degree: 3 },
        { window_size: 5, degree: 6 }, { window_size: 1 }, { window_size: 4 },
        { window_size: 3.5 }, { degree: 0 }, { degree: 1.5 },
    ]) {
        assert.deepEqual(smoothSavgol(larger, method), larger);
    }
});

test("Savgol preserves the library's asymmetric boundary samples and input data", () => {
    const counts = [9, 1, 8, 0, 6, 2, 7, 3, 5];
    const samples = counts.map((count, value) => ({ value, count }));
    const before = structuredClone(samples);
    const output = smoothSavgol(samples, { window_size: 5, degree: 3 });
    assert.deepEqual(output.slice(0, 3), samples.slice(0, 3));
    assert.deepEqual(output.slice(-2), samples.slice(-2));
    near(output[3].count, (-3 * 1 + 12 * 8 + 17 * 0 + 12 * 6 - 3 * 2) / 35);
    assert.deepEqual(samples, before);
    assert.notEqual(output[0], samples[0]);
});

test("normalization uses window_size/degree defaults and preserves valid parameters", () => {
    assert.deepEqual(resolveSmoothingConfig({ aggregate_view: { strategy: "smoothing" } }), {
        enabled: true,
        method: { type: "savgol", options: { window_size: 5, degree: 3 } },
        trigger: { type: "interaction", threshold: 50 },
    });
    const config = resolveSmoothingConfig(settings(method("savgol", {
        window_size: 3, degree: 1,
    }), { type: "time" }));
    assert.equal(config.method.options.window_size, 3);
    assert.equal(config.method.options.degree, 1);
    assert.equal(config.trigger.threshold, 3600);
    const invalid = resolveSmoothingConfig(settings(method("savgol", {
        window_size: 4, degree: 1.5,
    }), { threshold: NaN }));
    assert.equal(invalid.method.options.window_size, 5);
    assert.equal(invalid.method.options.degree, 3);
    assert.equal(invalid.trigger.threshold, 50);
});

test("interaction trigger counts commits including repeats, excluding baseline and samples", () => {
    const records = [{ kind: "baseline" }, ...history([10, 10, 10]), { kind: "sample" }];
    assert.equal(hasSmoothingTriggered(records, { type: "interaction", threshold: 3 }), true);
    assert.equal(hasSmoothingTriggered(records, { type: "interaction", threshold: 4 }), false);
});

test("time trigger uses recorded elapsed seconds and includes the baseline origin", () => {
    const records = [
        { kind: "baseline", timestamp: "2024-01-01T00:00:00Z" },
        { kind: "interaction", timestamp: "2024-01-01T01:00:00Z" },
    ];
    assert.equal(hasSmoothingTriggered(records, { type: "time", threshold: 3600 }), true);
    assert.equal(hasSmoothingTriggered(records, { type: "time", threshold: 3601 }), false);
    assert.equal(hasSmoothingTriggered([{ kind: "interaction", timestamp: "bad" }], { type: "time", threshold: 1 }), false);
});

test("single slider fills unvisited values with zero and retains provenance", () => {
    const provenance = new NumericProvenance(0, 10);
    [0, 5, 5, 10].forEach(value => provenance.insert(value));
    const before = structuredClone([...provenance.aggregateData]);
    const samples = buildSliderAggregateSamples({ provenance, min: 0, max: 10 });
    assert.equal(samples.length, 11);
    assert.equal(samples[0].count, 1);
    assert.equal(samples[5].count, 2);
    assert.equal(samples[6].count, 0);
    assert.equal(samples[10].count, 1);
    const output = resolveSliderAggregateSmoothing({ scalability: settings(), records: history([0, 5, 5, 10]), provenance, min: 0, max: 10 });
    assert.ok(output.every(sample => Number.isFinite(sample.count) && sample.count >= 0));
    assert.deepEqual([...provenance.aggregateData], before);
});

test("range slider samples disjoint coverage buckets, not endpoint histograms", () => {
    const provenance = new RangedProvenance(0, 100);
    [[20, 80], [0, 100]].forEach(value => provenance.insert(value));
    const samples = buildSliderAggregateSamples({ provenance, min: 0, max: 100, kind: "range" });
    assert.equal(samples[0].count, 1);
    assert.equal(samples[20].count, 2);
    assert.equal(samples[50].count, 2);
    assert.equal(samples[80].count, 1);
    assert.equal(samples[100].count, 1);
    const gap = { aggregateData: new Map([[0, { count: 2, highValue: 3 }], [8, { count: 4, highValue: 10 }]]) };
    const missing = buildSliderAggregateSamples({ provenance: gap, min: 0, max: 10, kind: "range" });
    assert.equal(missing[3].count, 0);
    assert.equal(missing[7].count, 0);
    assert.equal(missing[10].count, 4);
});

test("smoothing is independent of temporal strategy and ignores unsupported methods", () => {
    const provenance = new NumericProvenance(0, 10);
    provenance.insert(5);
    const input = { records: history([5]), provenance, min: 0, max: 10 };
    assert.deepEqual(resolveSliderAggregateSmoothing(input), []);
    for (const type of ["unknown"]) {
        assert.deepEqual(resolveSliderAggregateSmoothing({ ...input,
            scalability: settings(method(type)) }), []);
    }
    assert.deepEqual(resolveSliderAggregateSmoothing({ ...input, scalability: { temporal_view: { strategy: "smoothing" } } }), []);
    const active = settings();
    active.temporal_view = { strategy: "clipping" };
    assert.equal(resolveSliderAggregateSmoothing({ ...input, scalability: active }).length, 11);
});

test("Gaussian matches the normalized kernel, preserves constants at edges and respects truncate", () => {
    const impulse = Array.from({ length: 11 }, (_, value) => ({ value, count: value === 5 ? 1 : 0 }));
    const output = smoothGaussian(impulse, { sigma: 1, truncate: 2 });
    const total = 1 + 2 * Math.exp(-0.5) + 2 * Math.exp(-2);
    near(output[5].count, 1 / total);
    near(output[4].count, Math.exp(-0.5) / total);
    assert.equal(output[2].count, 0);
    const constant = impulse.map(sample => ({ ...sample, count: 7 }));
    smoothGaussian(constant).forEach(sample => near(sample.count, 7));
    const scaled = impulse.map(sample => ({ ...sample, value: sample.value / 10 }));
    assert.deepEqual(smoothGaussian(scaled, { sigma: 0.1, truncate: 2 }).map(sample => sample.count),
        output.map(sample => sample.count));
    assert.deepEqual(smoothGaussian([]), []);
});

test("Gaussian and B-spline normalize their own defaults and constraints", () => {
    assert.deepEqual(resolveSmoothingConfig(settings(method("gaussian"))).method,
        { type: "gaussian", options: { sigma: 2, truncate: 3 } });
    assert.deepEqual(resolveSmoothingConfig(settings(method("gaussian", {
        sigma: -1, truncate: Infinity,
    }))).method, { type: "gaussian", options: { sigma: 2, truncate: 3 } });
    assert.deepEqual(resolveSmoothingConfig(settings(method("bspline"))).method,
        { type: "bspline", options: { degree: 3, smoothing_factor: 0.5, knot_spacing: 10 } });
    assert.deepEqual(resolveSmoothingConfig(settings(method("bspline", {
        degree: 6, smoothing_factor: NaN, knot_spacing: 0,
    }))).method,
    { type: "bspline", options: { degree: 3, smoothing_factor: 0.5, knot_spacing: 10 } });
    const valid = resolveSmoothingConfig(settings(method("bspline", {
        degree: 1, smoothing_factor: 0, knot_spacing: 0.1,
    })));
    assert.equal(valid.method.options.smoothing_factor, 0);
    assert.equal(valid.method.options.knot_spacing, 0.1);
});

test("B-spline reproduces affine signals at every degree and smoothing strength", () => {
    const samples = Array.from({ length: 41 }, (_, index) => ({ value: index / 10, count: 2 + index / 5 }));
    for (const degree of [1, 2, 3, 4, 5]) {
        for (const smoothing_factor of [0, 0.5, 0.95, 1]) {
            const output = smoothBspline(samples, { degree, smoothing_factor, knot_spacing: 0.7 });
            output.forEach((sample, index) => near(sample.count, samples[index].count, 1e-7));
        }
    }
});

test("B-spline without interior knots matches quadratic polynomial least squares", () => {
    const samples = Array.from({ length: 21 }, (_, value) => ({ value, count: 3 + 2 * value + value ** 2 }));
    const output = smoothBspline(samples, { degree: 2, smoothing_factor: 0, knot_spacing: 100 });
    output.forEach((sample, index) => near(sample.count, samples[index].count, 1e-7));
});

test("B-spline reproduces a piecewise linear signal and knot spacing changes the fit", () => {
    const samples = Array.from({ length: 9 }, (_, value) => ({ value, count: 4 - Math.abs(value - 4) }));
    const fitted = smoothBspline(samples, { degree: 1, smoothing_factor: 0, knot_spacing: 4 });
    fitted.forEach((sample, index) => near(sample.count, samples[index].count));
    const noKnots = smoothBspline(samples, { degree: 1, smoothing_factor: 0, knot_spacing: 20 });
    assert.ok(Math.abs(noKnots[4].count - fitted[4].count) > 1);
});

test("Gaussian and B-spline remain finite on the maximum adapter grid", () => {
    const samples = Array.from({ length: 2049 }, (_, value) => ({ value, count: 3 + Math.sin(value / 6) }));
    const gaussian = smoothGaussian(samples, { sigma: 1e9 });
    assert.ok(gaussian.every(sample => Number.isFinite(sample.count) && sample.count > 0));
    for (const smoothing_factor of [0, 0.5, 0.9999, 1 - Number.EPSILON]) {
        const output = smoothBspline(samples, { degree: 5, knot_spacing: 0.001, smoothing_factor });
        assert.ok(output.every(sample => Number.isFinite(sample.count)));
        assert.notDeepEqual(output, samples);
    }
});

test("B-spline reduces roughness with strength and uses the least-squares line at one", () => {
    const samples = Array.from({ length: 61 }, (_, value) => ({ value, count: 3 + value / 30 + (value % 2 ? 1 : -1) }));
    const roughness = data => data.slice(2).reduce((sum, sample, index) =>
        sum + (sample.count - 2 * data[index + 1].count + data[index].count) ** 2, 0);
    const weak = smoothBspline(samples, { knot_spacing: 1, smoothing_factor: 0 });
    const strong = smoothBspline(samples, { knot_spacing: 1, smoothing_factor: 0.8 });
    assert.ok(roughness(strong) < roughness(weak));
    const line = smoothBspline(samples, { smoothing_factor: 1 });
    assert.ok(roughness(line) < 1e-20);
    // Least-squares residual is orthogonal to both constant and x.
    near(line.reduce((sum, sample, index) => sum + sample.count - samples[index].count, 0), 0);
    near(line.reduce((sum, sample, index) => sum + sample.value * (sample.count - samples[index].count), 0), 0);
});

test("B-spline limits dense knots, handles short data, and preserves domain scaling", () => {
    const samples = Array.from({ length: 51 }, (_, value) => ({ value, count: 3 + Math.sin(value) }));
    const before = structuredClone(samples);
    const options = { degree: 5, knot_spacing: 0.00001, smoothing_factor: 0.5 };
    const dense = smoothBspline(samples, options);
    assert.ok(dense.every(sample => Number.isFinite(sample.count)));
    assert.notDeepEqual(dense, samples);
    assert.notDeepEqual(smoothBspline(samples, { ...options, smoothing_factor: 0 }), samples);
    assert.deepEqual(smoothBspline(samples, { ...options, smoothing_factor: 1 - Number.EPSILON }),
        smoothBspline(samples, { ...options, smoothing_factor: 1 }));
    const scaled = samples.map(sample => ({ ...sample, value: 100 + sample.value / 10 }));
    const output = smoothBspline(scaled, { ...options, knot_spacing: options.knot_spacing / 10 });
    output.forEach((sample, index) => near(sample.count, dense[index].count, 1e-7));
    assert.deepEqual(samples, before);
    assert.deepEqual(smoothBspline(samples.slice(0, 3)), samples.slice(0, 3));
    assert.deepEqual(smoothBspline([]), []);
});

test("all methods route both aggregate Slider kinds and obey the trigger", () => {
    for (const kind of ["single", "range"]) {
        const provenance = kind === "single" ? new NumericProvenance(0, 20) : new RangedProvenance(0, 20);
        const values = kind === "single" ? [5, 10, 10] : [[2, 8], [5, 15], [5, 15]];
        values.forEach(value => provenance.insert(value));
        const before = structuredClone([...provenance.aggregateData]);
        const input = { provenance, kind, min: 0, max: 20, records: history(values) };
        for (const type of ["savgol", "gaussian", "bspline"]) {
            const output = resolveSliderAggregateSmoothing({ ...input,
                scalability: settings(method(type)) });
            assert.equal(output.length, 21);
            assert.ok(output.every(sample => Number.isFinite(sample.count) && sample.count >= 0));
            assert.ok(output.some(sample => sample.count > 0));
            assert.deepEqual(resolveSliderAggregateSmoothing({ ...input,
                scalability: settings(method(type), { threshold: 4 }) }), []);
        }
        assert.deepEqual([...provenance.aggregateData], before);
    }
});

test("large domains have bounded numerical sampling and degenerate domains produce no curve", () => {
    assert.equal(buildSliderAggregateSamples({ min: 0, max: 1e9, step: 0.01 }).length, 2049);
    assert.deepEqual(buildSliderAggregateSamples({ min: 0, max: 0 }), []);
    assert.deepEqual(buildSliderAggregateSamples({ min: 0, max: 10, step: 0 }), []);
});

test("large range domains average narrow coverage into bounded samples", () => {
    const provenance = {
        aggregateData: new Map([
            [5000, { highValue: 5001, count: 10, index: 1 }],
        ]),
    };
    const samples = buildSliderAggregateSamples({
        provenance,
        min: 0,
        max: 10000,
        step: 1,
        kind: "range",
    });

    assert.equal(samples.length, 2049);
    assert.ok(samples.some(sample => sample.count > 0));
    assert.ok(Math.max(...samples.map(sample => sample.count)) < 10);
});
