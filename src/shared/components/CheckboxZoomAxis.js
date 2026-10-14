import { useLayoutEffect, useRef, useState } from "react";
import ZoomedRangeAxis from "./ZoomedRangeAxis.js";

/** Align the selected-domain axis with the actual checkbox history tracks. */
export default function CheckboxZoomAxis({ id, elementRef, domain, mode }) {
    const footerRef = useRef(null);
    const [layout, setLayout] = useState({ left: 0, width: 0 });
    useLayoutEffect(() => {
        const group = elementRef.current;
        const footer = footerRef.current;
        if (!group || !footer) return undefined;
        const measure = () => {
            const track = [...group.querySelectorAll("[data-provenance-checkbox-track]")]
                .find(element => element.getAttribute("data-provenance-checkbox-track") === id);
            if (!track) {
                setLayout({ left: 0, width: 0 });
                return;
            }
            const bounds = track.getBoundingClientRect();
            const left = bounds.left - footer.getBoundingClientRect().left;
            setLayout(previous => previous.left === left && previous.width === bounds.width
                ? previous : { left, width: bounds.width });
        };
        measure();
        if (typeof ResizeObserver === "undefined") return undefined;
        const observer = new ResizeObserver(measure);
        observer.observe(group);
        group.querySelectorAll("[data-provenance-checkbox-track]").forEach(track => observer.observe(track));
        return () => observer.disconnect();
    }, [elementRef, id]);

    return (
        <div ref={footerRef} data-provenance-zoom-footer={id}
            style={{ position: "relative", height: 36, marginTop: 6 }}>
            {layout.width > 0 && (
                <div style={{ position: "absolute", left: layout.left, width: layout.width }}>
                    <ZoomedRangeAxis
                        domain={domain}
                        orientation="horizontal"
                        axisKind="interactions"
                        integerTicks={mode !== "time"}
                        pixelLength={layout.width}
                        horizontalInset={0}
                        rightInset={0}
                        step={mode === "time" ? Math.max((domain[1] - domain[0]) / 6, 0.001) : 1}
                        theme="light"
                        label={mode === "time" ? "Selected time range" : "Selected interaction range"}
                        formatTick={value => `${Number(Number(value).toFixed(2))}${mode === "time" ? "s" : ""}`}
                    />
                </div>
            )}
        </div>
    );
}
