// Additive timeline variant: bounded rendering and keyboard restoration.
import { useMemo } from "react";
import * as d3 from "d3";
import {
    formatTemporalTooltip,
    getTooltipAnchorProps,
} from "../shared/logic/provenanceTooltip.js";
import {
    buildClippedCheckboxBars,
    getClippedCheckboxRestorePoint,
} from "../shared/logic/scalability/strategies/clipping/checkboxClipping.js";

const ClippedTimelineVis = ({
    records,
    maxIndex,
    mode = "interaction",
    timeDomain,
    brushRange,
    leftInsetPx = 0,
    tooltipId,
    widgetId,
    value,
    kind = "single-selection",
    onRestore,
}) => {
    const bars = useMemo(
        () => buildClippedCheckboxBars({
            records,
            maxIndex,
            mode,
            timeDomain,
            brushRange,
        }).map(bar => {
            const recentColor = d3.interpolateOranges(
                0.3 + (bar.relativeTime * 0.7)
            );
            // Keep old intervals neutral and scent the most recent interval.
            const color = bar.isLatest
                ? recentColor
                : "#E5E5E5";
            const borderColor =
                d3.color(color)?.darker()?.formatHex?.() ??
                "#AA6E00";
            return {
                ...bar,
                left: `${bar.left}%`,
                width: `${bar.width}%`,
                color,
                borderColor,
            };
        }),
        [
            records,
            maxIndex,
            mode,
            timeDomain,
            brushRange,
        ]
    );

    const restoreBar = (bar, event) => {
        if (!onRestore) return;
        event.preventDefault();
        event.stopPropagation();
        const bounds =
            event.currentTarget?.parentElement?.getBoundingClientRect?.();
        const clientX = Number(event.clientX);
        const pointerRatio =
            event.type === "click" && event.detail !== 0 &&
            bounds &&
            Number.isFinite(clientX) &&
            bounds.width > 0
                ? Math.max(
                    0,
                    Math.min(1, (clientX - bounds.left) / bounds.width)
                )
                : null;
        const point = getClippedCheckboxRestorePoint(bar, pointerRatio);
        onRestore(value, bar.record, event, {
            point,
            mode,
            bar,
        });
    };

    return (
        <div
            style={{
                position: "relative",
                height: "24px",
                background: "transparent",
                width: "100%",
                flex: 1,
            }}
        >
            <div
                style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: `${leftInsetPx}px`,
                    right: 0,
                    overflow: "hidden",
                }}
            >
                {bars.map(bar => {
                    const tooltipProps = getTooltipAnchorProps(
                        tooltipId,
                        () => formatTemporalTooltip({
                            label: widgetId,
                            value,
                            record: bar.record,
                            kind,
                        })
                    );

                    return (
                        <div
                            key={bar.key}
                            data-provenance-timeline-bar="true"
                            data-provenance-temporal-value={value}
                            {...tooltipProps}
                            role={onRestore ? "button" : undefined}
                            tabIndex={onRestore ? 0 : undefined}
                            aria-label={
                                onRestore
                                    ? `Restore ${widgetId} to ${value}`
                                    : undefined
                            }
                            onMouseDown={event => {
                                if (!onRestore) return;
                                event.preventDefault();
                                event.stopPropagation();
                            }}
                            onClick={event => {
                                restoreBar(bar, event);
                            }}
                            onKeyDown={event => {
                                if (
                                    !onRestore ||
                                    (
                                        event.key !== "Enter" &&
                                        event.key !== " "
                                    )
                                ) {
                                    return;
                                }
                                restoreBar(bar, event);
                            }}
                            style={{
                                ...tooltipProps.style,
                                position: "absolute",
                                left: bar.left,
                                width: bar.width,
                                minWidth: "8px",
                                boxSizing: "border-box",
                                height: "24px",
                                top: 0,
                                backgroundColor: bar.color,
                                opacity: 1,
                                border: `1px solid ${bar.borderColor}`,
                                zIndex: 0,
                                cursor: onRestore
                                    ? "pointer"
                                    : "default",
                            }}
                        />
                    );
                })}
            </div>
        </div>
    );
};

export default ClippedTimelineVis;
