import assert from "node:assert/strict";
import { test } from "node:test";
import {
    getInputTextAutoZoomRange,
    getInputTextZoomDomain,
    resolveInputTextTemporalZoom,
    resolveTemporalZoomActions,
    temporalTriggerMetric,
} from "../src/shared/logic/scalability/index.js";

const entry = (index, seconds, kind, value = `search-${index}`) => [
    String(index),
    [{
        value,
        time: new Date(seconds * 1000),
        kind,
        sequenceIndex: kind === "interaction" ? index : Math.max(0, index - 1),
    }],
];

const entries = [
    entry(0, 0, "baseline", ""),
    entry(1, 2, "interaction"),
    entry(2, 7, "sample"),
    entry(2, 12, "interaction"),
    entry(3, 15, "interaction"),
    entry(4, 18, "sample"),
];

const zoom = options => ({
    temporal_view: {
        strategy: "zoom_in",
        zoom_in_options: options,
    },
});

test("InputText temporal zoom honors strategy, modes, and temporalBrush", () => {
    assert.equal(resolveInputTextTemporalZoom({ entries }).visible, true);
    assert.equal(resolveInputTextTemporalZoom({
        entries,
        scalability: { temporal_view: { strategy: "smoothing" } },
    }).enabled, false);
    assert.equal(resolveInputTextTemporalZoom({
        entries,
        scalability: zoom({ modes: ["values", "interactions-values"] }),
    }).enabled, false);
    assert.equal(resolveInputTextTemporalZoom({
        entries,
        scalability: zoom({ modes: ["interactions"] }),
        temporalBrush: false,
    }).enabled, false);
});

test("InputText after-trigger visibility counts committed interactions only", () => {
    const hidden = resolveInputTextTemporalZoom({
        entries: entries.slice(0, 4),
        scalability: zoom({
            modes: ["interactions"],
            visibility: "after-trigger",
            trigger: { type: "interaction", threshold: 3 },
        }),
    });
    assert.equal(hidden.triggerEntries.length, 2);
    assert.equal(hidden.visible, false);

    const visible = resolveInputTextTemporalZoom({
        entries: entries.slice(0, 5),
        scalability: zoom({
            modes: ["interactions"],
            visibility: "after-trigger",
            trigger: { type: "interaction", threshold: 3 },
        }),
    });
    assert.equal(visible.triggerEntries.length, 3);
    assert.equal(visible.visible, true);

    const off = resolveInputTextTemporalZoom({
        entries,
        scalability: zoom({
            modes: ["interactions"],
            visibility: "off",
        }),
    });
    assert.equal(off.enabled, true);
    assert.equal(off.visible, false);
});

test("InputText time visibility uses recorded elapsed time including samples", () => {
    const before = resolveInputTextTemporalZoom({
        entries: entries.slice(0, 3),
        scalability: zoom({
            modes: ["interactions"],
            visibility: "after-trigger",
            trigger: { type: "time", threshold: 10 },
        }),
    });
    assert.equal(before.visible, false);

    const after = resolveInputTextTemporalZoom({
        entries: entries.slice(0, 4),
        scalability: zoom({
            modes: ["interactions"],
            visibility: "after-trigger",
            trigger: { type: "time", threshold: 10 },
        }),
    });
    assert.equal(after.visible, true);
});

test("InputText auto zoom maps trigger records back to complete temporal rows", () => {
    assert.deepEqual(
        getInputTextAutoZoomRange(entries, {
            type: "interaction",
            threshold: 2,
        }),
        [3, 5]
    );
    assert.deepEqual(
        getInputTextAutoZoomRange(entries, {
            type: "time",
            threshold: 10,
        }),
        [3, 5]
    );
});

test("InputText selected-range axis uses interaction or elapsed-time domains", () => {
    assert.deepEqual(
        getInputTextZoomDomain(entries, [1, 4], "interaction"),
        [1, 3]
    );
    assert.deepEqual(
        getInputTextZoomDomain(entries, [1, 4], "time"),
        [2, 15]
    );
    assert.equal(getInputTextZoomDomain(entries, null, "interaction"), null);
});

test("InputText auto zoom crosses interaction trigger without baseline or samples", () => {
    const view = resolveInputTextTemporalZoom({
        entries: entries.slice(0, 5),
        scalability: zoom({
            modes: ["interactions"],
            trigger: {
                type: "interaction",
                threshold: 3,
                auto_zoom: true,
            },
        }),
    });
    const currentMetric = temporalTriggerMetric(
        view.triggerEntries,
        view.config.trigger.type
    );
    assert.equal(currentMetric, 3);
    assert.equal(resolveTemporalZoomActions({
        entries: view.triggerEntries,
        trigger: view.config.trigger,
        previousMetric: 2,
    }).shouldAutoZoom, true);
});
