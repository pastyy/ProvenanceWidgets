/** Each threshold boundary starts an empty display period; history is untouched. */
export function getClippingBoundary({ metric, config }) {
    if (!config.ready || !Number.isFinite(metric) || metric < config.threshold) return 0;
    return Math.floor(metric / config.threshold) * config.threshold;
}
