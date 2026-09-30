/** Trigger decision only; presentation and axis mapping belong to higher layers. */
export function isClippingTriggered({ count, config }) {
    return config.enabled && Number.isFinite(count) && Math.floor(count) > config.threshold;
}
