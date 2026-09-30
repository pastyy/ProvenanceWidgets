/** Default size of each compressed interaction block. */
export const DEFAULT_CLIPPING_THRESHOLD = 50;

export function resolveTemporalClippingConfig(scalability) {
    const view = scalability?.temporal_view;
    const strategy = view?.strategy ?? "zoom_in";
    const enabled = strategy === "clipping";
    // Inactive strategy options must have no effect on the selected strategy.
    const trigger = enabled ? view?.clipping_options?.trigger ?? {} : {};
    if (enabled && trigger.type && trigger.type !== "on_interaction_over") {
        throw new RangeError("Temporal clipping currently supports on_interaction_over only.");
    }
    const threshold = Number(trigger.threshold ?? DEFAULT_CLIPPING_THRESHOLD);
    return {
        strategy,
        enabled,
        triggerType: enabled ? trigger.type ?? "on_interaction_over" : null,
        threshold: Number.isFinite(threshold) && threshold > 0
            ? Math.max(1, Math.floor(threshold))
            : DEFAULT_CLIPPING_THRESHOLD,
    };
}
