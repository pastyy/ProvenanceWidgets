const getRecordTime = record => {
    const value = record?.time ?? record?.select?.time;
    const timestamp = value instanceof Date
        ? value.getTime()
        : new Date(value).getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
};

/** Whether a scalability tool should remain visible before its trigger. */
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
        return (
            (Math.max(...timestamps) - Math.min(...timestamps)) / 1000
        ) >= threshold;
    }

    return entries.length >= threshold;
};
