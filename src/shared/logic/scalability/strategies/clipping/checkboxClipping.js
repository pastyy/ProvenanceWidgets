import { normalizeSelectionBrushRange, buildSelectionTimelineBars } from "../../../selectionTimeline.js";

export const COMPRESSED_HISTORY_PERCENT = 25;

/** One complete axis: old history takes 10%, the latest block takes 90%. */
export function getCheckboxClippingWindow({ count = 0, config, brushRange = null }) {
    const end = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
    const active = config.enabled && end > config.threshold;
    // At 51..100, compress 0..50. At 101..150, compress 0..100.
    const cutoff = active ? Math.floor((end - 1) / config.threshold) * config.threshold : 0;
    const axisRange = normalizeSelectionBrushRange(brushRange ?? (active ? [COMPRESSED_HISTORY_PERCENT, 100] : [0, 100]));
    const axis = { active, cutoff, domain: [0, end] };
    const visibleDomain = axisRange.map(position => checkboxAxisToInteraction(position, axis));
    return {
        ...axis,
        axisRange,
        visibleDomain,
        brushRange: end > 0 ? visibleDomain.map(value => value / end * 100) : [0, 100],
    };
}

export function checkboxAxisToInteraction(position, { active, cutoff, domain }) {
    const percent = Math.max(0, Math.min(100, Number(position) || 0));
    const end = domain[1];
    if (!active) return end * percent / 100;
    return percent <= COMPRESSED_HISTORY_PERCENT
        ? cutoff * percent / COMPRESSED_HISTORY_PERCENT
        : cutoff + (end - cutoff) * (percent - COMPRESSED_HISTORY_PERCENT) / (100 - COMPRESSED_HISTORY_PERCENT);
}

/** Inverse of `checkboxAxisToInteraction`: interaction index -> axis position (%). */
export function checkboxInteractionToAxisPosition(interaction, { active, cutoff, domain }) {
    const end = domain?.[1] ?? 0;
    const n = Math.max(0, Math.min(end, Number(interaction) || 0));
    if (!active || end <= 0) return end > 0 ? (n / end) * 100 : 0;
    if (n <= cutoff) return (n / cutoff) * COMPRESSED_HISTORY_PERCENT;
    return (
        COMPRESSED_HISTORY_PERCENT +
        ((n - cutoff) / (end - cutoff)) * (100 - COMPRESSED_HISTORY_PERCENT)
    );
}

/** Crossing the compressed segment recalls all older data; returning recalls the latest block. */
export function resolveCheckboxAxisSelection(range, previousRange, window) {
    const next = normalizeSelectionBrushRange(range);
    if (!window.active) return next;
    const [previousLow, previousHigh] = previousRange;
    if (previousHigh <= COMPRESSED_HISTORY_PERCENT && next[1] > COMPRESSED_HISTORY_PERCENT) return [COMPRESSED_HISTORY_PERCENT, 100];
    if (previousLow >= COMPRESSED_HISTORY_PERCENT && next[0] < COMPRESSED_HISTORY_PERCENT) return [0, COMPRESSED_HISTORY_PERCENT];
    if (next[1] <= COMPRESSED_HISTORY_PERCENT) return [0, COMPRESSED_HISTORY_PERCENT];
    return next;
}

/** Strict intersection prevents old intervals touching the left edge from leaking in. */
export function buildClippedCheckboxBars(options) {
    return buildSelectionTimelineBars(options).filter(bar =>
        bar.visibleMax > bar.visibleMin &&
        bar.endValue > bar.visibleMin &&
        bar.startValue < bar.visibleMax
    );
}

/** Geometry shared by label hover and the actual timeline bars (including 8px targets). */
export function findClippedCheckboxBar(bars, clientX, bounds) {
    if (!bounds || !Number.isFinite(clientX) || bounds.width <= 0) return null;
    const x = clientX - bounds.left;
    if (x < 0 || x > bounds.width) return null;
    return [...bars].reverse().find(bar => {
        const left = bounds.width * bar.left / 100;
        const right = Math.min(bounds.width, left + Math.max(8, bounds.width * bar.width / 100));
        return x >= left && x <= right;
    }) ?? null;
}

export function getClippedCheckboxRestorePoint(bar, pointerRatio = null) {
    const point = Number.isFinite(pointerRatio)
        ? bar.visibleMin + Math.max(0, Math.min(1, pointerRatio)) * (bar.visibleMax - bar.visibleMin)
        : Math.max(bar.startValue, bar.visibleMin);
    // Short bars have a minimum hit target; never restore outside the hit interval.
    return Math.max(bar.visibleMin, bar.startValue,
        Math.min(point, bar.visibleMax, bar.endValue));
}
