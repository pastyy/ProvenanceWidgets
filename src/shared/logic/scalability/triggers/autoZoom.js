const getRecordTime = record => {
    const value = record?.time ?? record?.select?.time;
    const timestamp = value instanceof Date
        ? value.getTime()
        : new Date(value).getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
};

export const temporalTriggerMetric = (entries, triggerType) => {
    if (!Array.isArray(entries)) return 0;
    if (triggerType !== "on_time_over") return entries.length;

    const timestamps = entries
        .map(([, records]) => getRecordTime(records?.[0]))
        .filter(value => value !== null);
    if (timestamps.length < 2) return 0;

    return (Math.max(...timestamps) - Math.min(...timestamps)) / 1000;
};

/** Whether a temporal auto-zoom trigger was crossed by the latest entries. */
export const hasTemporalZoomTriggerCrossed = ({
    previousEntries = [],
    previousMetric,
    entries = [],
    trigger = {},
} = {}) => {
    if (trigger.auto_zoom_on_trigger !== true) return false;

    const threshold = Number(trigger.threshold);
    if (!Number.isFinite(threshold) || threshold <= 0) return false;

    const priorMetric = Number.isFinite(Number(previousMetric))
        ? Number(previousMetric)
        : temporalTriggerMetric(previousEntries, trigger.type);
    const currentMetric = temporalTriggerMetric(entries, trigger.type);
    return priorMetric < threshold && currentMetric >= threshold;
};
