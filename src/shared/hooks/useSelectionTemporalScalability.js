import { useEffect, useState } from "react";
import { normalizeSelectionBrushRange } from "../logic/selectionTimeline.js";
import { shouldCommitSliderChange } from "../logic/sliderInteraction.js";
import {
    getSelectionInteractionCount,
    resolveSelectionTemporalView,
} from "../logic/scalability/index.js";

/** Shared temporal strategy selection and brush presentation for selection widgets. */
export default function useSelectionTemporalScalability({
    id,
    widget,
    mode,
    provenance,
    scalability,
}) {
    const [brushRange, setBrushRange] = useState(null);
    const [brushDisplayRange, setBrushDisplayRange] = useState(null);
    const count = getSelectionInteractionCount(provenance);
    const defaultView = resolveSelectionTemporalView({
        scalability,
        mode,
        count,
        brushRange: null,
    });
    const brushKey = [
        defaultView.config.strategy,
        defaultView.clippingEnabled,
        defaultView.config.threshold,
        defaultView.window.cutoff,
    ].join(":");
    const displayRange = brushDisplayRange?.key === brushKey
        ? brushDisplayRange.value
        : null;
    const selectedRange = displayRange ?? (
        brushRange?.key === brushKey ? brushRange.value : null
    );
    const view = selectedRange === null
        ? defaultView
        : resolveSelectionTemporalView({
            scalability,
            mode,
            count,
            brushRange: selectedRange,
        });

    useEffect(() => {
        setBrushRange(null);
        setBrushDisplayRange(null);
    }, [brushKey]);

    const commit = range => {
        setBrushRange({ key: brushKey, value: range });
        setBrushDisplayRange({ key: brushKey, value: range });
        window.dispatchEvent(new CustomEvent("provenance-widgets", {
            detail: {
                id,
                widget,
                mode,
                interaction: "brush-end",
                data: { selection: range },
            },
        }));
    };
    const onChange = event => {
        const range = normalizeSelectionBrushRange(event.value);
        setBrushDisplayRange({ key: brushKey, value: range });
        if (shouldCommitSliderChange(event)) {
            commit(range);
        }
    };
    const onSlideEnd = event => {
        const range = normalizeSelectionBrushRange(event.value ?? displayRange);
        commit(range);
    };

    return {
        enabled: view.clippingEnabled,
        showTemporalAxis: view.showTemporalAxis,
        brushRange: view.effectiveBrushRange,
        sliderProps: {
            startLabel: mode === "time" ? "t=0" : "n=0",
            clipCount: view.clipCount,
            nowLabel: view.clippingEnabled ? `now (${count})` : "now",
            axis: view.clippingEnabled ? view.window : null,
            ticks: view.clippingEnabled ? view.ticks : [],
            step: view.sliderStep,
            value: displayRange ?? (
                view.clippingEnabled ? view.window.axisRange : [0, 100]
            ),
            onChange,
            onSlideEnd,
        },
    };
}
