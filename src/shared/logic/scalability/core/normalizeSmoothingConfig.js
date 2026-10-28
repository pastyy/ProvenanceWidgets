import {
    DEFAULT_TEMPORAL_INTERACTION_THRESHOLD,
    DEFAULT_TEMPORAL_TIME_THRESHOLD,
} from "./defaults.js";

const positive = (value, fallback) =>
    typeof value === "number" && Number.isFinite(value) && value > 0
        ? value : fallback;

/** Smoothing is opt-in per view. Unsupported methods never fall back to Savgol. */
export function resolveSmoothingConfig(scalability, view = "aggregate_view") {
    const config = scalability?.[view];
    const options = config?.smoothing_options ?? {};
    const method = options.method ?? { type: "savgol" };
    const type = options.trigger?.type === "time" ? "time" : "interaction";
    const threshold = positive(options.trigger?.threshold, type === "time"
        ? DEFAULT_TEMPORAL_TIME_THRESHOLD : DEFAULT_TEMPORAL_INTERACTION_THRESHOLD);
    const normalizedMethod = method.type === "gaussian" ? {
        type: "gaussian",
        sigma: positive(method.sigma, 2),
        truncate: positive(method.truncate, 3),
    } : method.type === "bspline" ? {
        type: "bspline",
        degree: Number.isInteger(method.degree) && method.degree >= 1 && method.degree <= 5
            ? method.degree : 3,
        smoothing_factor: typeof method.smoothing_factor === "number" &&
            Number.isFinite(method.smoothing_factor) && method.smoothing_factor >= 0 &&
            method.smoothing_factor <= 1 ? method.smoothing_factor : 0.5,
        knot_spacing: positive(method.knot_spacing, 10),
    } : {
        type: method.type,
        window_size: Number.isInteger(method.window_size) && method.window_size >= 3 &&
            method.window_size % 2 === 1 ? method.window_size : 5,
        degree: Number.isInteger(method.degree) && method.degree >= 1 ? method.degree : 3,
    };
    return {
        enabled: config?.strategy === "smoothing" && ["savgol", "gaussian", "bspline"].includes(method.type),
        method: normalizedMethod,
        trigger: { type, threshold: Math.max(1, Math.floor(threshold)) },
    };
}
