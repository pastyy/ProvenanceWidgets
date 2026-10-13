import { useEffect, useRef, useState } from "react";
import useSelectionTemporalScalability from "./useSelectionTemporalScalability.js";
import { getSelectionTimeDomain, normalizeSelectionBrushRange } from "../logic/selectionTimeline.js";
import {
    resolveTemporalZoomIn, isTemporalZoomToolVisible, temporalTriggerMetric,
    resolveTemporalZoomActions, getTemporalAutoZoomRange,
} from "../logic/scalability/index.js";

/** Checkbox uses the same zoom options as numeric sliders, without axis compression. */
export default function useCheckboxTemporalScalability(options) {
    const selectionView = useSelectionTemporalScalability(options);
    const { id, records, mode, scalability, provenance, temporalBrush } = options;
    const config = resolveTemporalZoomIn(scalability);
    const enabled = config.enabled && config.modes.includes("interactions") && temporalBrush;
    const zoomRecords = records.filter(record => config.trigger.type === "time" || record.kind === "interaction");
    const entries = zoomRecords.map((record, index) => [index, [{ time: record.timestamp }]]);
    const metric = temporalTriggerMetric(entries, config.trigger.type);
    const key = JSON.stringify([id, mode, temporalBrush, config]);
    const [selection, setSelection] = useState(null);
    const [suggestion, setSuggestion] = useState(null);
    const previous = useRef(null);
    const timeDomain = getSelectionTimeDomain(records);
    // Checkbox supplies maxIndex = domainMax + 1 to its temporal bars.
    const end = mode === "time" ? (timeDomain[1] - timeDomain[0]) / 1000
        : Math.max(provenance?.domain?.get("index")?.[1] ?? 0, 1);
    const visible = enabled && isTemporalZoomToolVisible({ entries, visibility: config.visibility, trigger: config.trigger });
    const range = visible && selection?.key === key ? selection.value : [0, 100];
    const autoRange = () => {
        const indexes = getTemporalAutoZoomRange(entries, config.trigger);
        if (!indexes) return [0, 100];
        const startTime = new Date(entries[indexes[0]][1][0].time).getTime();
        const recordsWithoutSamples = records.filter(record => record.kind !== "sample");
        const startIndex = recordsWithoutSamples.indexOf(zoomRecords[indexes[0]]);
        const start = mode === "time" ? (startTime - timeDomain[0]) / 1000 : Math.max(0, startIndex);
        return normalizeSelectionBrushRange([start / end * 100, 100]);
    };
    useEffect(() => {
        const prior = previous.current;
        const reset = !prior || prior.key !== key || metric < prior.metric;
        const actions = resolveTemporalZoomActions({
            entries, trigger: config.trigger, enabled: enabled && config.visibility !== "off",
            previousMetric: reset ? 0 : prior.metric,
            alreadyAutoZoomed: !reset && prior.autoZoomed,
            suggestionHandled: !reset && prior.handled,
        });
        if (reset) {
            setSelection(null);
            setSuggestion(null);
        }
        if (actions.shouldAutoZoom) setSelection({ key, value: autoRange() });
        if (actions.shouldSuggest) setSuggestion(key);
        previous.current = { key, metric,
            autoZoomed: actions.shouldAutoZoom || (!reset && prior.autoZoomed),
            handled: actions.shouldSuggest || (!reset && prior.handled) };
    }, [key, metric]);

    if (!config.enabled) return selectionView;
    return {
        ...selectionView,
        showTemporalAxis: visible,
        brushRange: range,
        suggestionVisible: suggestion === key && visible,
        acceptSuggestion: () => {
            setSelection({ key, value: autoRange() });
            setSuggestion(null);
        },
        dismissSuggestion: () => setSuggestion(null),
        zoomProps: {
            domain: [0, end], value: range,
            onChange: value => setSelection({ key, value: normalizeSelectionBrushRange(value) }),
            onCommit: value => window.dispatchEvent(new CustomEvent("provenance-widgets", {
                detail: { id, widget: "checkbox-group", mode, interaction: "brush-end", data: { selection: value } },
            })),
        },
    };
}
