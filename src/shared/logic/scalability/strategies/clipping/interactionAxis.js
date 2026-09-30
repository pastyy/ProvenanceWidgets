import { normalizeSelectionBrushRange } from "../../../selectionTimeline.js";

export const COMPRESSED_HISTORY_PERCENT = 25;

/**
 * Map an interaction count and trigger decision to one temporal axis.
 * Input: normalized positive threshold, trigger decision, optional axis-percent brush.
 * Output: axis domain/cutoff, selected axis range, visible interaction domain,
 * and the equivalent brush percentage in the uncompressed domain.
 */
export function getInteractionClippingWindow({ count = 0, active = false, threshold, brushRange = null }) {
    const end = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
    // At 51..100, compress 0..50. At 101..150, compress 0..100.
    const cutoff = active ? Math.floor((end - 1) / threshold) * threshold : 0;
    const axisRange = normalizeSelectionBrushRange(brushRange ?? (active ? [COMPRESSED_HISTORY_PERCENT, 100] : [0, 100]));
    const axis = { active, cutoff, domain: [0, end] };
    const visibleDomain = axisRange.map(position => axisToInteraction(position, axis));
    return {
        ...axis,
        axisRange,
        visibleDomain,
        axisStep: active && cutoff > 0 ? COMPRESSED_HISTORY_PERCENT / cutoff : null,
        brushRange: end > 0 ? visibleDomain.map(value => value / end * 100) : [0, 100],
    };
}

export function axisToInteraction(position, { active, cutoff, domain }) {
    const percent = Math.max(0, Math.min(100, Number(position) || 0));
    const end = domain[1];
    if (!active) return end * percent / 100;
    return percent <= COMPRESSED_HISTORY_PERCENT
        ? cutoff * percent / COMPRESSED_HISTORY_PERCENT
        : cutoff + (end - cutoff) * (percent - COMPRESSED_HISTORY_PERCENT) / (100 - COMPRESSED_HISTORY_PERCENT);
}

/** Inverse of `axisToInteraction`: interaction index -> axis position (%). */
export function interactionToAxisPosition(interaction, { active, cutoff, domain }) {
    const end = domain?.[1] ?? 0;
    const n = Math.max(0, Math.min(end, Number(interaction) || 0));
    if (!active || end <= 0) return end > 0 ? (n / end) * 100 : 0;
    if (n <= cutoff) return (n / cutoff) * COMPRESSED_HISTORY_PERCENT;
    return (
        COMPRESSED_HISTORY_PERCENT +
        ((n - cutoff) / (end - cutoff)) * (100 - COMPRESSED_HISTORY_PERCENT)
    );
}
