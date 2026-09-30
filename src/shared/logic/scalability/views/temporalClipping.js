import { isClippingTriggered } from "../triggers/clipping.js";
import {
    interactionToAxisPosition,
    getInteractionClippingWindow,
} from "../strategies/clipping/interactionAxis.js";

/** Resolve the interaction axis contract shared by selection widgets. */
export function resolveTemporalClippingView({ config, mode, count, brushRange }) {
    const clippingEnabled = config.enabled && mode === "interaction";
    const active = isClippingTriggered({
        count,
        config: { ...config, enabled: clippingEnabled },
    });
    const window = getInteractionClippingWindow({
        count,
        active,
        threshold: config.threshold,
        brushRange,
    });
    const ticks = [];
    if (active) {
        for (let interaction = config.threshold; interaction <= window.cutoff; interaction += config.threshold) {
            ticks.push({
                position: interactionToAxisPosition(interaction, window),
                label: `n=${interaction}`,
            });
        }
    }
    return {
        config,
        clippingEnabled,
        showTemporalAxis: config.strategy === "zoom_in" || config.strategy === "clipping",
        window,
        ticks,
        clipCount: active ? Math.floor(window.cutoff / config.threshold) : 0,
        sliderStep: window.axisStep,
        effectiveBrushRange: clippingEnabled ? window.brushRange : (brushRange ?? [0, 100]),
    };
}
