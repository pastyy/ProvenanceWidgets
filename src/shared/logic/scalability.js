const DEFAULT_ZOOM_BY = ["interactions", "values", "rectangle-2d"];

const unique = values => Array.from(new Set(values));

/**
 * Resolve the temporal zoom-in portion of the public scalability contract.
 * Keeping this normalization in one place lets Chart retain its legacy
 * temporalBrush prop while opting into the newer zoom dimensions.
 */
export const resolveTemporalZoomIn = scalability => {
    const temporalView = scalability?.temporal_view;
    const strategy = temporalView?.strategy ?? "zoom_in";
    const options = temporalView?.zoom_in_options ?? {};
    const configuredZoomBy = Array.isArray(options.zoom_by)
        ? unique(options.zoom_by)
        : DEFAULT_ZOOM_BY;
    const zoomBy = configuredZoomBy.filter(value =>
        DEFAULT_ZOOM_BY.includes(value)
    );

    return {
        enabled: strategy === "zoom_in",
        zoomBy: zoomBy.length > 0 ? zoomBy : DEFAULT_ZOOM_BY,
        trigger: options.trigger ?? {},
    };
};

const getRecordTime = record => {
    const value = record?.time ?? record?.select?.time;
    const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
};

/** Whether a zoom tool should remain visible before its configured trigger. */
export const isTemporalZoomToolVisible = ({
    entries = [],
    trigger = {},
}) => {
    if (trigger.tool_visible_before_trigger !== false) return true;

    const threshold = Number(trigger.threshold);
    if (!Number.isFinite(threshold) || threshold <= 0) return false;

    if (trigger.type === "on_time_over") {
        const timestamps = entries
            .map(([, records]) => getRecordTime(records?.[0]))
            .filter(value => value !== null);
        if (timestamps.length < 2) return false;
        return (Math.max(...timestamps) - Math.min(...timestamps)) / 1000 >= threshold;
    }

    return entries.length >= threshold;
};

export const brushSelectionToValueRange = (
    selection,
    width,
    min,
    max,
    step = 1
) => {
    if (
        !Array.isArray(selection) ||
        selection.length !== 2 ||
        !Number.isFinite(width) ||
        width <= 0 ||
        !Number.isFinite(min) ||
        !Number.isFinite(max) ||
        max <= min
    ) return null;

    const start = Math.max(0, Math.min(width, Math.min(...selection)));
    const end = Math.max(0, Math.min(width, Math.max(...selection)));
    const span = max - min;
    const normalizedStep = Number.isFinite(step) && step > 0 ? step : 1;
    const snap = value => min + Math.round((value - min) / normalizedStep) * normalizedStep;
    const rangeMin = Math.max(min, Math.min(max, snap(min + (start / width) * span)));
    const rangeMax = Math.max(rangeMin, Math.min(max, snap(min + (end / width) * span)));
    return [rangeMin, rangeMax];
};
