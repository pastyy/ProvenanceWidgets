import { DEFAULT_ZOOM_BY } from "./defaults.js";

const unique = values => Array.from(new Set(values));

/**
 * Resolve temporal zoom-in configuration without depending on a widget or UI
 * framework. View renderers can use the returned contract to decide which
 * dimension tools to render.
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
