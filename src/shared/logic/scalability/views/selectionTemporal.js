import { normalizeSelectionBrushRange } from "../../selectionTimeline.js";
import { resolveTemporalClippingConfig } from "../core/normalizeClippingConfig.js";
import { getInteractionClippingWindow } from "../strategies/clipping/interactionAxis.js";
import { resolveTemporalClippingView } from "./temporalClipping.js";

/** Dispatch a selection widget's temporal behavior by the selected strategy. */
export function resolveSelectionTemporalView({ scalability, mode, count, brushRange }) {
    const config = resolveTemporalClippingConfig(scalability);
    if (config.strategy === "clipping") {
        return resolveTemporalClippingView({ config, mode, count, brushRange });
    }

    // Keep the existing uncompressed brush for strategies outside this first
    // selection-clipping implementation. Their option objects are not read.
    const window = getInteractionClippingWindow({
        count,
        active: false,
        threshold: config.threshold,
        brushRange,
    });
    return {
        config,
        clippingEnabled: false,
        showTemporalAxis: config.strategy === "zoom_in",
        window,
        ticks: [],
        clipCount: 0,
        effectiveBrushRange: normalizeSelectionBrushRange(brushRange),
    };
}
