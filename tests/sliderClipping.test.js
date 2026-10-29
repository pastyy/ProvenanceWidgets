import assert from "node:assert/strict";
import { test } from "node:test";
import {
    NumericProvenance,
    RangedProvenance,
} from "@provenance-widgets/core";
import {
    resolveRecordAggregateView,
    resolveRecordTemporalView,
} from "../src/shared/logic/scalability/index.js";

const clipping = (threshold, type = "interaction") => ({
    strategy: "clipping",
    clipping_options: { trigger: { type, threshold } },
});

const makeRecords = values => values.map((value, index) => ({
    value,
    timestamp: new Date(index * 1000).toISOString(),
    source: "history",
    kind: "interaction",
}));

const makeEntries = records => records.map((record, index) => [
    String(index + 1),
    [{
        value: record.value,
        time: new Date(record.timestamp),
        kind: record.kind,
        sequenceIndex: index + 1,
    }],
]);

const createStrategy = (kind, values) => {
    const strategy = kind === "single"
        ? new NumericProvenance(0, 20)
        : new RangedProvenance(0, 20);
    values.forEach((value, index) => strategy.insert(value, {
        time: new Date(index * 1000),
        kind: "interaction",
        source: "history",
    }));
    return strategy;
};

test("slider temporal clipping keeps the latest interaction window for both slider kinds", () => {
    for (const values of [
        [1, 4, 7, 9, 12],
        [[1, 4], [2, 7], [4, 9], [8, 13], [10, 16]],
    ]) {
        const records = makeRecords(values);
        const view = resolveRecordTemporalView({
            entries: makeEntries(records),
            scalability: { temporal_view: clipping(2) },
            width: 300,
            mode: "interaction",
        });

        assert.equal(view.enabled, true);
        assert.equal(view.boundary, 3);
        assert.deepEqual(
            view.entries.map(([, [record]]) => record.value),
            values.slice(-2)
        );
        assert.deepEqual(view.positions, [4, 5]);
    }
});

test("slider aggregate clipping rebuilds single-value and range statistics without mutating source history", () => {
    const cases = [
        { kind: "single", values: [1, 2, 2, 5], expected: [2, 5] },
        { kind: "range", values: [[1, 4], [2, 6], [4, 9], [7, 12]], expected: [[4, 9], [7, 12]] },
    ];

    for (const { kind, values, expected } of cases) {
        const records = makeRecords(values);
        const source = createStrategy(kind, values);
        const sourceEntries = [...source.detailedData.entries()];
        const strategyFactory = () => kind === "single"
            ? new NumericProvenance(0, 20)
            : new RangedProvenance(0, 20);
        const view = resolveRecordAggregateView({
            records,
            provenance: source,
            strategyFactory,
            scalability: { aggregate_view: clipping(2) },
            width: 300,
            mode: "interaction",
        });

        assert.equal(view.boundary, 2);
        assert.notEqual(view.aggregateProvenance, source);
        assert.deepEqual(
            [...view.aggregateProvenance.detailedData.values()].map(record => record.value),
            expected
        );
        assert.deepEqual([...source.detailedData.entries()], sourceEntries);
    }
});

test("slider temporal and aggregate clipping configurations stay independent", () => {
    const values = [1, 2, 3, 4];
    const records = makeRecords(values);
    const entries = makeEntries(records);
    const source = createStrategy("single", values);
    const strategyFactory = () => new NumericProvenance(0, 20);
    const scalability = {
        temporal_view: clipping(3),
        aggregate_view: clipping(1),
    };

    const temporal = resolveRecordTemporalView({
        entries, scalability, width: 300, mode: "interaction",
    });
    const aggregate = resolveRecordAggregateView({
        records, provenance: source, strategyFactory,
        scalability, width: 300, mode: "interaction",
    });

    assert.deepEqual(
        temporal.entries.map(([, [record]]) => record.value),
        [2, 3, 4]
    );
    assert.deepEqual(
        [...aggregate.aggregateProvenance.detailedData.values()].map(record => record.value),
        [4]
    );
});

test("time clipping uses recorded elapsed time and reports hidden interactions", () => {
    const records = [
        { value: 0, timestamp: new Date(0).toISOString(), kind: "baseline" },
        { value: 2, timestamp: new Date(2000).toISOString(), kind: "interaction" },
        { value: 2, timestamp: new Date(7000).toISOString(), kind: "sample" },
        { value: 8, timestamp: new Date(12000).toISOString(), kind: "interaction" },
        { value: 9, timestamp: new Date(15000).toISOString(), kind: "interaction" },
    ];
    const view = resolveRecordTemporalView({
        entries: makeEntries(records),
        scalability: { temporal_view: clipping(10, "time") },
        width: 300,
        mode: "time",
    });

    assert.equal(view.boundary, 5);
    assert.equal(view.startCount, 1);
    assert.deepEqual(
        view.entries.map(([, [record]]) => record.value),
        [8, 9]
    );
    assert.deepEqual(view.positions, [12, 15]);
});
