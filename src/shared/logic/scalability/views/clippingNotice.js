import { resolveClippingConfig } from "../core/normalizeClippingConfig.js";
import { resolveClippingPeriod } from "./clippingPeriod.js";

export function resolveClippingNoticePeriods({ records, scalability, width, mode }) {
    return ["temporal_view", "aggregate_view"].map(view => resolveClippingPeriod({
        records, mode, config: resolveClippingConfig(scalability, { view, width }),
    }));
}

/** Persistent while older history is hidden; synchronized views announce once. */
export function getClippingNotice(periods) {
    const messages = new Set();
    for (const period of periods) {
        if (!period.config.ready || period.boundary <= 0) continue;
        const hidden = Number(period.boundary.toFixed(2));
        messages.add(`hide ${hidden} ${period.config.triggerType === "on_time_over" ? "seconds" : "interacts"}`);
    }
    return messages.size ? [...messages].join(" · ") : null;
}

/** Footprint badges report hidden interactions, including time-based clipping. */
export function getClippingBadgeMessage(periods) {
    const counts = new Set(periods
        .filter(period => period.config.strategy === "clipping" && period.config.ready && period.boundary > 0)
        .map(period => period.startCount));
    return counts.size
        ? [...counts].map(count => `${count} interaction${count === 1 ? "" : "s"} hidden`).join(" · ")
        : null;
}

/** Only the displayed view determines whether the footprint carries a badge. */
export function resolveActiveClippingBadge(options) {
    const period = resolveClippingNoticePeriods(options).find(period =>
        period.config.view === (options.showTimeline ? "temporal_view" : "aggregate_view"));
    return { message: getClippingBadgeMessage([period]), revision: period.resetKey };
}
