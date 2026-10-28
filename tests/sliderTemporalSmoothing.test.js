import assert from "node:assert/strict";
import { test } from "node:test";
import {
    resolveSliderAggregateSmoothing,
    resolveSliderTemporalSmoothing,
} from "../src/shared/logic/scalability/index.js";
import { NumericProvenance } from "@provenance-widgets/core";

const temporalSettings = (
    method = { type: "savgol" },
    trigger = { threshold: 1 }
) => ({
    temporal_view: {
        strategy: "smoothing",
        smoothing_options: { method, trigger },
    },
});

const entries = (values, timestamps = []) => values.map((value, index) => [
    String(index + 1),
    [{
        value,
        select: { index: Array.isArray(value) ? value[0] : value },
        unselect: Array.isArray(value) ? { index: value[1] } : undefined,
        time: new Date(timestamps[index] ?? index * 1000),
        kind: "interaction",
        sequenceIndex: index + 1,
    }],
]);

test("single Slider temporal smoothing is independent from aggregate smoothing", () => {
    const source = entries([0, 10, 0, 10, 0, 10, 0, 10, 0]);
    const before = structuredClone(source);
    const temporal = resolveSliderTemporalSmoothing({
        scalability: temporalSettings(),
        entries: source,
        min: 0,
        max: 10,
    });
    assert.equal(temporal.active, true);
    assert.equal(temporal.method, "savgol");
    assert.equal(temporal.samples.length, source.length);
    assert.ok(temporal.samples.every(sample =>
        sample.value >= 0 && sample.value <= 10 && Number.isFinite(sample.value)));
    assert.ok(temporal.samples.some((sample, index) =>
        sample.value !== source[index][1][0].value));
    assert.deepEqual(source, before);

    const provenance = new NumericProvenance(0, 10);
    provenance.insert(5);
    assert.deepEqual(resolveSliderAggregateSmoothing({
        scalability: temporalSettings(),
        records: [{ kind: "interaction" }],
        provenance,
        min: 0,
        max: 10,
    }), []);
});

test("temporal Savgol maps window_size 3 and degree 1 to a three-point average", () => {
    const source = entries([0, 0, 0, 0, 9, 0, 0, 0, 0]);
    const result = resolveSliderTemporalSmoothing({
        scalability: temporalSettings({ type: "savgol", window_size: 3, degree: 1 }),
        entries: source,
        min: 0,
        max: 10,
    });
    assert.equal(result.active, true);
    for (const index of [3, 4, 5]) {
        assert.ok(Math.abs(result.samples[index].value - 3) < 1e-9);
    }
});

test("RangeSlider smooths center and span while preserving valid ordered endpoints", () => {
    const source = entries([[0, 8], [6, 10], [1, 9], [7, 10], [0, 6]]);
    for (const type of ["savgol", "gaussian", "bspline"]) {
        const result = resolveSliderTemporalSmoothing({
            scalability: temporalSettings({ type }),
            entries: source,
            range: true,
            min: 0,
            max: 10,
        });
        assert.equal(result.active, true);
        assert.equal(result.method, type);
        assert.ok(result.samples.every(sample =>
            Number.isFinite(sample.low) &&
            Number.isFinite(sample.high) &&
            sample.low >= 0 &&
            sample.low <= sample.high &&
            sample.high <= 10));
    }
});

test("temporal trigger gates smoothing and unsupported methods remain inactive", () => {
    const source = entries([1, 3, 2]);
    assert.equal(resolveSliderTemporalSmoothing({
        scalability: temporalSettings({ type: "gaussian" }, { threshold: 4 }),
        entries: source,
        min: 0,
        max: 10,
    }).active, false);
    assert.equal(resolveSliderTemporalSmoothing({
        scalability: temporalSettings({ type: "unknown" }),
        entries: source,
        min: 0,
        max: 10,
    }).active, false);
    assert.equal(resolveSliderTemporalSmoothing({
        scalability: {
            aggregate_view: {
                strategy: "smoothing",
                smoothing_options: { trigger: { threshold: 1 } },
            },
        },
        entries: source,
        min: 0,
        max: 10,
    }).active, false);
});

test("time mode uses elapsed seconds and retains temporal offsets", () => {
    const source = entries([0, 10, 0], [0, 2000, 10000]);
    const result = resolveSliderTemporalSmoothing({
        scalability: temporalSettings(
            { type: "gaussian", sigma: 2, truncate: 3 },
            { type: "time", threshold: 10 }
        ),
        entries: source,
        mode: "time",
        min: 0,
        max: 10,
    });
    assert.equal(result.active, true);
    assert.deepEqual(result.samples.map(sample => sample.position), [0, 2, 10]);
    assert.deepEqual(result.samples.map(sample => sample.offset), [0, 0.2, 1]);
});

test("large temporal histories use a bounded display series", () => {
    const source = entries(Array.from({ length: 3000 }, (_, index) => index % 11));
    const result = resolveSliderTemporalSmoothing({
        scalability: temporalSettings(),
        entries: source,
        min: 0,
        max: 10,
    });
    assert.equal(result.active, true);
    assert.equal(result.samples.length, 2049);
    assert.equal(result.samples[0].offset, 0);
    assert.equal(result.samples.at(-1).offset, 1);
});
