import { SelectionProvenance } from "@provenance-widgets/core";
import { resolveClippingConfig } from "../core/normalizeClippingConfig.js";
import { getClippingBoundary } from "../triggers/clipping.js";

const timestamp = record => {
    const value = new Date(record?.timestamp).getTime();
    return Number.isFinite(value) ? value : null;
};
const isInteraction = record => record.kind === "interaction";

/** Pure display projection. Never mutate the controller, source records, or source strategy. */
function resolveClippedView({ records, interactions, origin, latest }, provenance, config) {
    const metric = config.triggerType === "on_time_over"
        ? (latest - origin) / 1000
        : interactions.length;
    const boundary = getClippingBoundary({ metric, config });
    if (!boundary) {
        return {
            config, boundary, provenance,
            startCount: 0, startTime: origin,
        };
    }

    const byTime = config.triggerType === "on_time_over";
    const boundaryRecord = byTime ? null : interactions[boundary - 1];
    const startTime = byTime ? origin + boundary * 1000 : timestamp(boundaryRecord) ?? latest;
    const cutoff = byTime
        ? records.findLastIndex(record => timestamp(record) !== null && timestamp(record) <= startTime)
        : records.indexOf(boundaryRecord);
    const remaining = records.slice(cutoff + 1).filter(isInteraction);
    const startCount = byTime
        ? records.slice(0, cutoff + 1).filter(isInteraction).length
        : boundary;
    const display = new SelectionProvenance();

    // Remember the selected set only to count later selection/deselection deltas.
    // It contributes no aggregate frequency and is not rendered as old history.
    if (config.view === "aggregate_view") {
        const baseline = records.slice(0, cutoff + 1).findLast(record => record.kind !== "sample");
        if (baseline) {
            display.insert(baseline.value, { time: new Date(startTime), kind: "baseline" });
            display.aggregateData.clear();
            for (const key of ["index", "selections", "interactions", "selectionIndex", "interactionIndex"]) {
                display.domain.set(key, [0, 0]);
            }
        }
    }
    for (const record of remaining) {
        const options = {
            time: new Date(record.timestamp), caller: record.caller,
            kind: record.kind, source: record.source,
        };
        display.insert(record.value, options);
    }
    return {
        config, boundary, provenance: display, startCount, startTime,
    };
}

/** One configuration/trigger contract for all four categorical selection widgets. */
export function resolveSelectionTemporalView({
    scalability, provenance, records = [], mode = "interaction", width = 0,
}) {
    // Scan full history once; each view only rebuilds its current display period.
    const interactions = [];
    let origin = Infinity;
    let latest = -Infinity;
    for (const record of records) {
        if (isInteraction(record)) interactions.push(record);
        const time = timestamp(record);
        if (time !== null) {
            origin = Math.min(origin, time);
            latest = Math.max(latest, time);
        }
    }
    if (!Number.isFinite(origin)) origin = latest = 0;
    const history = { records, interactions, origin, latest };
    const resolveView = view => resolveClippedView(
        history, provenance, resolveClippingConfig(scalability, { view, width })
    );
    const temporal = resolveView("temporal_view");
    const aggregate = resolveView("aggregate_view");
    const usesTime = mode === "time";
    const start = usesTime ? (temporal.startTime - origin) / 1000 : temporal.startCount;
    const end = usesTime ? (latest - origin) / 1000 : interactions.length;
    const clipped = temporal.boundary > 0;
    return {
        temporalProvenance: temporal.provenance,
        aggregateProvenance: aggregate.provenance,
        timeDomain: clipped
            ? [temporal.startTime, Math.max(temporal.startTime + 1, latest)]
            : null,
        // Clipping replaces the display period; its brush cannot recover older periods.
        clippingEnabled: clipped,
        showTemporalAxis: ["zoom_in", "clipping"].includes(temporal.config.strategy),
        axis: temporal.config.enabled
            ? { active: false, domain: [start, end], unit: usesTime ? "seconds" : "interactions" }
            : null,
        startLabel: `${usesTime ? "t" : "n"}=${start}`,
        nowLabel: temporal.config.enabled ? `now (${end})` : "now",
        resetKey: [temporal.config.strategy, temporal.config.triggerType, temporal.config.threshold,
            temporal.boundary, temporal.startCount, mode].join(":"),
    };
}
