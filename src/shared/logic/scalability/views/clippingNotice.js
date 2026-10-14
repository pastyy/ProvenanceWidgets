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
