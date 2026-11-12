import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveClippingConfig } from "../src/shared/logic/scalability/strategies/clipping/config.js";
import { resolveSelectionTemporalView } from "../src/shared/logic/scalability/strategies/clipping/selectionTemporal.js";
import { resolveRecordTemporalView } from "../src/shared/logic/scalability/strategies/clipping/recordTemporal.js";
import { resolveRecordAggregateView } from "../src/shared/logic/scalability/strategies/clipping/recordAggregate.js";
import { resolveTemporalZoomIn } from "../src/shared/logic/scalability/strategies/zoomin/config.js";
import { resolveSmoothingConfig } from "../src/shared/logic/scalability/strategies/smoothing/config.js";

test("omitted strategies default to aggregate none and temporal zoom_in independently", () => {
    for (const scalability of [undefined, {}, { aggregate_view: {}, temporal_view: {} }]) {
        assert.equal(resolveClippingConfig(scalability, { view: "aggregate_view" }).strategy, "none");
        assert.equal(resolveClippingConfig(scalability).strategy, "zoom_in");
        assert.equal(resolveTemporalZoomIn(scalability).enabled, true);
    }
    assert.equal(resolveTemporalZoomIn({ aggregate_view: { strategy: "none" } }).enabled, true);
    assert.equal(resolveClippingConfig({ temporal_view: { strategy: "clipping" } }, {
        view: "aggregate_view",
    }).strategy, "none");
});

const inactiveOptions = {
    strategy: "none",
    zoom_in_options: { trigger: { threshold: 1, auto_zoom: true } },
    clipping_options: { trigger: { threshold: 1 } },
    smoothing_options: { trigger: { threshold: 1 } },
};

test("explicit none disables all mechanisms even when their options are configured", () => {
    const scalability = { aggregate_view: inactiveOptions, temporal_view: inactiveOptions };
    assert.equal(resolveTemporalZoomIn(scalability).enabled, false);
    for (const view of ["aggregate_view", "temporal_view"]) {
        const clipping = resolveClippingConfig(scalability, { view, width: 300 });
        assert.equal(clipping.strategy, "none");
        assert.equal(clipping.enabled, false);
        assert.equal(clipping.ready, false);
        assert.equal(resolveSmoothingConfig(scalability, view).enabled, false);
    }
});

test("none preserves complete categorical and record-based views", () => {
    const scalability = { aggregate_view: inactiveOptions, temporal_view: inactiveOptions };
    const provenance = { detailedData: new Map(), aggregateData: new Map() };
    const records = Array.from({ length: 5 }, (_, index) => ({
        value: index, kind: "interaction", timestamp: new Date(index * 1000).toISOString(),
    }));
    const entries = records.map((record, index) => [String(index), [{
        value: record.value, kind: record.kind, time: record.timestamp,
    }]]);
    const selection = resolveSelectionTemporalView({ scalability, provenance, records, width: 300 });
    assert.equal(selection.temporalProvenance, provenance);
    assert.equal(selection.aggregateProvenance, provenance);
    assert.equal(selection.clippingEnabled, false);
    assert.equal(selection.showTemporalAxis, false);
    const temporal = resolveRecordTemporalView({ scalability, entries, width: 300 });
    assert.equal(temporal.enabled, false);
    assert.deepEqual(temporal.entries, entries);
    const aggregate = resolveRecordAggregateView({ scalability, provenance, records, width: 300 });
    assert.equal(aggregate.aggregateProvenance, provenance);
});

test("none in one view does not disable the other view's active strategy", () => {
    const scalability = {
        aggregate_view: { strategy: "clipping" },
        temporal_view: { strategy: "none" },
    };
    assert.equal(resolveTemporalZoomIn(scalability).enabled, false);
    assert.equal(resolveClippingConfig(scalability, { view: "aggregate_view", width: 300 }).enabled, true);
    assert.equal(resolveSmoothingConfig({
        aggregate_view: { strategy: "none" },
        temporal_view: { strategy: "smoothing" },
    }, "temporal_view").enabled, true);
});
