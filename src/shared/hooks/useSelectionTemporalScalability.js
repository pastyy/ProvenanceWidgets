import { useEffect, useState } from "react";
import { normalizeSelectionBrushRange } from "../logic/selectionTimeline.js";
import { shouldCommitSliderChange } from "../logic/sliderInteraction.js";
import {
    getSelectionInteractionCount,
    resolveTemporalClippingBrushEnd,
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
    const view = resolveSelectionTemporalView({
        scalability,
        mode,
        count,
        brushRange,
    });

    useEffect(() => {
        setBrushRange(null);
        setBrushDisplayRange(null);
    }, [view.clippingEnabled, view.config.strategy]);

    const commit = range => {
        setBrushRange(range);
        setBrushDisplayRange(range);
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
        setBrushDisplayRange(range);
        if (shouldCommitSliderChange(event)) {
            commit(resolveTemporalClippingBrushEnd(range, brushRange, view.window));
        }
    };
    const onSlideEnd = event => {
        const range = resolveTemporalClippingBrushEnd(
            event.value ?? brushDisplayRange,
            brushRange,
            view.window
        );
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
            value: brushDisplayRange ?? (
                view.clippingEnabled ? view.window.axisRange : [0, 100]
            ),
            onChange,
            onSlideEnd,
        },
    };
}
