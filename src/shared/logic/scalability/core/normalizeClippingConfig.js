/** Each threshold-sized block becomes compressed history once exceeded. */
export const CHECKBOX_CLIPPING_WINDOW = 50;

export function resolveCheckboxClipping(scalability) {
    const view = scalability?.temporal_view;
    const enabled = (view?.strategy ?? "clipping") === "clipping";
    const trigger = view?.clipping_options?.trigger ?? {};
    if (enabled && trigger.type && trigger.type !== "on_interaction_over") {
        throw new RangeError("Checkbox clipping currently supports on_interaction_over only.");
    }
    const threshold = Number(trigger.threshold ?? CHECKBOX_CLIPPING_WINDOW);
    return {
        enabled,
        threshold: Number.isFinite(threshold) && threshold > 0
            ? Math.max(1, Math.floor(threshold))
            : CHECKBOX_CLIPPING_WINDOW,
    };
}
