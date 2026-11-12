import assert from "node:assert/strict";
import { test } from "node:test";
import {
    buildSuperTemporalBars,
    getSuperTemporalAutoZoomRange,
    resolveSuperTemporalZoom,
    resolveTemporalZoomActions,
    temporalTriggerMetric,
} from "../src/shared/logic/scalability/index.js";
import { buildSuperInteractionSequence } from "../src/shared/logic/superProvenanceData.js";

const interactions = [0, 2, 12, 20].map((seconds, index) => ({
    widgetId: index % 2 ? "checkbox" : "slider",
    time: new Date(Date.UTC(2026, 0, 1) + seconds * 1000),
    index: index % 2 + 1,
    color: index % 2 ? "blue" : "orange",
}));
const zoom = options => ({ temporal_view: { strategy: "zoom_in", zoom_in_options: options } });

test("SuperProvenance uses shared manual zoom defaults and only interactions modes", () => {
    const view = resolveSuperTemporalZoom({ interactions });
    assert.equal(view.enabled, true);
    assert.equal(view.visible, true);
    assert.deepEqual(view.config.trigger, { type: "interaction", threshold: 50, auto_zoom: false });
    for (const modes of [["values"], ["interactions-values"]]) {
        assert.equal(resolveSuperTemporalZoom({ interactions, scalability: zoom({ modes }) }).enabled, false);
    }
    assert.equal(resolveSuperTemporalZoom({ interactions, scalability: zoom({ modes: ["interactions"] }) }).visible, true);
});

test("SuperProvenance ignores aggregate strategies and disables unsupported temporal strategies", () => {
    assert.equal(resolveSuperTemporalZoom({ interactions,
        scalability: { aggregate_view: { strategy: "clipping" } },
    }).visible, true);
    for (const strategy of ["clipping", "smoothing"]) {
        assert.equal(resolveSuperTemporalZoom({ interactions,
            scalability: { temporal_view: { strategy } },
        }).visible, false);
    }
    assert.equal(resolveSuperTemporalZoom({ interactions, temporalBrush: false }).visible, false);
    assert.equal(resolveSuperTemporalZoom({ interactions, scalability: zoom({ visibility: "off" }) }).visible, false);
    assert.equal(resolveSuperTemporalZoom().visible, false);
    assert.equal(resolveSuperTemporalZoom({ interactions: interactions.slice(0, 1) }).visible, false);
});

test("SuperProvenance interaction visibility counts the combined sequence, not local indices", () => {
    const scalability = zoom({ visibility: "after-trigger", trigger: { type: "interaction", threshold: 4 } });
    assert.equal(resolveSuperTemporalZoom({ interactions: interactions.slice(0, 3), scalability }).visible, false);
    const view = resolveSuperTemporalZoom({ interactions, scalability });
    assert.equal(view.visible, true);
    assert.equal(temporalTriggerMetric(view.entries, "interaction"), 4);
});

test("SuperProvenance time triggers use recorded elapsed seconds", () => {
    const scalability = zoom({ visibility: "after-trigger", trigger: { type: "time", threshold: 15 } });
    assert.equal(resolveSuperTemporalZoom({ interactions: interactions.slice(0, 3), scalability }).visible, false);
    const view = resolveSuperTemporalZoom({ interactions, scalability });
    assert.equal(view.visible, true);
    assert.equal(temporalTriggerMetric(view.entries, "time"), 20);
    assert.equal(resolveSuperTemporalZoom({ interactions: interactions.map(record => ({ ...record, time: null })), scalability }).visible, false);
});

test("SuperProvenance auto zoom uses complete cell boundaries for count and time windows", () => {
    const { entries } = resolveSuperTemporalZoom({ interactions });
    assert.deepEqual(getSuperTemporalAutoZoomRange(entries, { type: "interaction", threshold: 2 }), [50, 100]);
    assert.deepEqual(getSuperTemporalAutoZoomRange(entries, { type: "time", threshold: 10 }), [50, 100]);
    assert.deepEqual(getSuperTemporalAutoZoomRange(entries, { type: "interaction", threshold: 1 }), [75, 100]);
    assert.deepEqual(getSuperTemporalAutoZoomRange(entries, { type: "interaction", threshold: 50 }), [0, 100]);
    assert.deepEqual(getSuperTemporalAutoZoomRange(), [0, 100]);
});

test("SuperProvenance reuses one-shot auto zoom trigger crossing policy", () => {
    const { entries } = resolveSuperTemporalZoom({ interactions });
    const trigger = { type: "interaction", threshold: 3, auto_zoom: true };
    assert.equal(resolveTemporalZoomActions({ entries, trigger, previousMetric: 2 }).shouldAutoZoom, true);
    assert.equal(resolveTemporalZoomActions({ entries, trigger, previousMetric: 3 }).shouldAutoZoom, false);
    assert.equal(resolveTemporalZoomActions({ entries, trigger, alreadyAutoZoomed: true }).shouldAutoZoom, false);
    assert.equal(resolveTemporalZoomActions({ entries, trigger, enabled: false }).shouldAutoZoom, false);
});

test("SuperProvenance auto zoom never leaves floating-point slivers of excluded cells", () => {
    for (let count = 2; count <= 100; count += 1) {
        const source = Array.from({ length: count }, (unused, index) => ({ index }));
        const { entries } = resolveSuperTemporalZoom({ interactions: source });
        const range = getSuperTemporalAutoZoomRange(entries, { type: "interaction", threshold: 2 });
        assert.deepEqual(buildSuperTemporalBars(source, range).map(bar => bar.sequenceIndex), [count - 2, count - 1]);
    }
});

test("SuperProvenance zoom clips and aligns shared cells without changing restore records", () => {
    const bars = buildSuperTemporalBars(interactions, [12.5, 62.5]);
    assert.deepEqual(bars.map(({ sequenceIndex, left, width }) => ({ sequenceIndex, left, width })), [
        { sequenceIndex: 0, left: 0, width: 25 },
        { sequenceIndex: 1, left: 25, width: 50 },
        { sequenceIndex: 2, left: 75, width: 25 },
    ]);
    bars.forEach(bar => assert.equal(bar.interaction, interactions[bar.sequenceIndex]));
    assert.equal(interactions.length, 4);
    assert.deepEqual(interactions.map(record => record.index), [1, 2, 1, 2]);
});

test("SuperProvenance range normalization, reset and empty histories are safe", () => {
    assert.deepEqual(buildSuperTemporalBars(), []);
    const full = buildSuperTemporalBars(interactions);
    assert.deepEqual(buildSuperTemporalBars(interactions, [0, 0]), full);
    assert.deepEqual(buildSuperTemporalBars(interactions, [-10, 110]), full);
    assert.deepEqual(buildSuperTemporalBars(interactions, [75, 25]), buildSuperTemporalBars(interactions, [25, 75]));
    assert.deepEqual(buildSuperTemporalBars(interactions, [25, 50]).map(bar => bar.sequenceIndex), [1]);
});

test("SuperProvenance trigger input excludes baseline and sampling records", () => {
    const history = { hasUserInteracted: true, detailedData: new Map([
        [0, { value: 0, time: interactions[0].time, kind: "baseline" }],
        [1, { value: 1, time: interactions[1].time, kind: "interaction" }],
        [2, { value: 1, time: interactions[2].time, kind: "sample" }],
        [3, { value: 2, time: interactions[3].time, kind: "interaction" }],
    ]) };
    const sequence = buildSuperInteractionSequence({
        superProvenance: { registeredWidgets: new Map([["slider", {}]]) },
        registeredComponents: new Map([["slider", history]]),
    });
    const view = resolveSuperTemporalZoom({ interactions: sequence });
    assert.equal(view.entries.length, 2);
    assert.equal(temporalTriggerMetric(view.entries, "time"), 18);
    assert.equal(history.detailedData.size, 4);
});
