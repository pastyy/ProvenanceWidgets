/** CSS pixels per record (or second for on_time_over) in the default threshold. */
export const CLIPPING_PIXELS_PER_RECORD = 10;

export function resolveClippingConfig(scalability, { view = "temporal_view", width = 0 } = {}) {
    // With no aggregate override, both views reset at the same boundary.
    const options = scalability?.[view] ?? (
        view === "aggregate_view" && scalability?.temporal_view?.strategy === "clipping"
            ? scalability.temporal_view
            : undefined
    );
    const strategy = options?.strategy ?? "zoom_in";
    const enabled = strategy === "clipping";
    const trigger = enabled ? options?.clipping_options?.trigger ?? {} : {};
    const configuredThreshold = Number(trigger.threshold);
    const measuredWidth = Number(width);
    const threshold = Number.isFinite(configuredThreshold) && configuredThreshold > 0
        ? Math.max(1, Math.floor(configuredThreshold))
        : Number.isFinite(measuredWidth) && measuredWidth > 0
            ? Math.max(1, Math.floor(measuredWidth / CLIPPING_PIXELS_PER_RECORD))
            : null;
    return {
        view,
        strategy,
        enabled,
        showTimeline: enabled && options?.clipping_options?.show_timeline === true,
        // Wait for layout when an explicit threshold is not supplied.
        ready: enabled && threshold !== null,
        triggerType: trigger.type === "on_time_over" ? "on_time_over" : "on_interaction_over",
        threshold,
    };
}
