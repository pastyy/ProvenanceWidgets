import { resolveClippingConfig } from "../core/normalizeClippingConfig.js";
import { resolveClippingPeriod } from "./clippingPeriod.js";

export function resolveClippingNoticePeriods({ records, scalability, width, mode }) {
    return ["temporal_view", "aggregate_view"].map(view => resolveClippingPeriod({
        records, mode, config: resolveClippingConfig(scalability, { view, width }),
    }));
}

/** Notify only on a new boundary, once when both views reset together. */
export function getClippingNotice(previous, periods) {
    if (!previous) return null;
    const messages = new Set();
    periods.forEach((period, index) => {
        const before = previous[index];
        const { config } = period;
        if (!config.ready || !before?.config.ready ||
            config.threshold !== before.config.threshold ||
            config.triggerType !== before.config.triggerType ||
            period.boundary <= before.boundary) return;
        messages.add(`hide ${config.threshold} ${config.triggerType === "on_time_over" ? "seconds" : "interacts"}`);
    });
    return messages.size ? [...messages].join(" · ") : null;
}
