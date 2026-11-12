import {
  DEFAULT_AGGREGATE_STRATEGY,
  DEFAULT_TEMPORAL_STRATEGY,
} from "../../src/shared/logic/scalability/shared/defaults.js";

const strategyOptions = {
  zoom_in: "zoom_in_options",
  clipping: "clipping_options",
  smoothing: "smoothing_options",
};

/** Send only the selected mechanism to each view; saved options stay in the demo defaults. */
export function configurePlaygroundScalability(defaults, overrides = {}) {
  return Object.fromEntries(["aggregate_view", "temporal_view"].map(view => {
    const source = defaults[view] ?? {};
    const strategy = overrides[view] ?? source.strategy ?? (view === "aggregate_view"
      ? DEFAULT_AGGREGATE_STRATEGY : DEFAULT_TEMPORAL_STRATEGY);
    const key = strategyOptions[strategy];
    // Do not enable independent window_options alongside clipping or smoothing.
    return [view, {
      strategy,
      ...(key && source[key] ? { [key]: source[key] } : {}),
    }];
  }));
}
