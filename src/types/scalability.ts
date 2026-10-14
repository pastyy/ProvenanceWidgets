export type ScalabilityStrategy =
  | "zoom_in"
  | "clipping"
  | "smoothing";

export type TemporalScalabilityTriggerType =
  | "on_interaction_over"
  | "on_time_over";

export type AggregateScalabilityTriggerType =
  | TemporalScalabilityTriggerType
  | "on_range_over";

export type TemporalZoomMode =
  | "interactions"
  | "values"
  | "interactions-values";

export type TemporalZoomVisibility =
  | "all-active"
  | "after-trigger"
  | "off";

export type TemporalZoomTriggerType = "interaction" | "time";

export interface ScalabilityThresholdTrigger<
  TType extends string = string,
> {
  type?: TType;
  threshold?: number;
}

export interface ScalabilityZoomTrigger<
  TType extends string = string,
> extends ScalabilityThresholdTrigger<TType> {
  /** Whether the zoom tool is visible before the threshold is reached. */
  tool_visible_before_trigger?: boolean;
  /** Whether zooming happens automatically at the threshold. */
  auto_zoom_on_trigger?: boolean;
  /** Whether to show a confirmation suggestion when auto zoom is disabled. */
  suggestion_on?: boolean;
}

export interface TemporalZoomInOptions {
  /** One or more interaction/value dimensions to use for temporal zooming. */
  modes?: TemporalZoomMode[];
  /** Whether zoom tools are always active, trigger-gated, or disabled. */
  visibility?: TemporalZoomVisibility;
  trigger?: ScalabilityThresholdTrigger<TemporalZoomTriggerType> & {
    /** Whether zooming happens automatically at the threshold. */
    auto_zoom?: boolean;
    /** Whether to show a confirmation suggestion when auto zoom is disabled. */
    suggestion?: boolean;
  };
}

export interface AggregateScalabilityZoomInOptions {
  trigger?: ScalabilityZoomTrigger<AggregateScalabilityTriggerType>;
}

/** Clears display history at each threshold; the source provenance is preserved.
 * Omitted/invalid thresholds use max(1, floor(widgetWidth / 10)) after layout.
 */
export interface ScalabilityClippingOptions<
  TType extends string = TemporalScalabilityTriggerType,
> {
  /** Defaults to on_interaction_over; on_time_over uses recorded elapsed seconds. */
  trigger?: ScalabilityThresholdTrigger<TType>;
}

export type TemporalScalabilityClippingOptions =
  ScalabilityClippingOptions<TemporalScalabilityTriggerType>;

export type AggregateScalabilityClippingOptions =
  ScalabilityClippingOptions<TemporalScalabilityTriggerType>;

export type ScalabilitySmoothingTriggerType = "interaction" | "time";

export type ScalabilitySmoothingMethod =
  | {
      type: "savgol";
      /** Total data-domain window width; defaults to 9 (positive, may be fractional).
       * The adapter converts it to an odd sample count greater than polyorder.
       */
      window_length?: number;
      /** Non-negative integer polynomial order; defaults to 2. */
      polyorder?: number;
    }
  | {
      type: "gaussian";
      /** Positive Gaussian standard deviation in data-domain units; defaults to 2. */
      sigma?: number;
      /** Positive support radius in standard deviations; defaults to 3.
       * The data-domain support radius is truncate * sigma.
       */
      truncate?: number;
    }
  | {
      type: "bspline";
      /** Integer spline degree in [1, 5]; defaults to 3 (cubic). */
      degree?: number;
      /** Normalized smoothing strength in [0, 1]; defaults to 0.5.
       * Larger values mean stronger smoothing; not a library-specific residual bound.
       * Slider: 0 = unpenalized B-spline fit, 1 = least-squares line.
       */
      smoothing_factor?: number;
      /** Positive distance between interior knots in data-domain units; defaults to 10. */
      knot_spacing?: number;
    };

/** Distance parameters always use the component's documented data domain.
 * Order, degree, truncate, and smoothing_factor are dimensionless.
 * Aggregate Slider views implement all three methods; temporal smoothing
 * remains an API contract only.
 */
export interface ScalabilitySmoothingOptions {
  /** Defaults to { type: "savgol", window_length: 9, polyorder: 2 }. */
  method?: ScalabilitySmoothingMethod;
  /** Defaults to interaction; threshold defaults to 50 interactions or 3600 seconds.
   * Both views count recorded interaction events, rather than aggregate item count.
   */
  trigger?: ScalabilityThresholdTrigger<ScalabilitySmoothingTriggerType>;
}

export interface ScalabilityWindowOptions {
  /** Number of aggregate items visible in the current window. */
  window_size?: number;
  /** Zero-based index of the first aggregate item in the window. */
  window_start?: number;
}

export interface TemporalViewScalability {
  strategy?: ScalabilityStrategy;
  zoom_in_options?: TemporalZoomInOptions;
  clipping_options?: TemporalScalabilityClippingOptions;
  smoothing_options?: ScalabilitySmoothingOptions;
}

export interface AggregateViewScalability {
  strategy?: ScalabilityStrategy;
  zoom_in_options?: AggregateScalabilityZoomInOptions;
  clipping_options?: AggregateScalabilityClippingOptions;
  smoothing_options?: ScalabilitySmoothingOptions;
  /** Applies to aggregate_view regardless of the selected strategy. */
  window_options?: ScalabilityWindowOptions;
}

export interface ScalabilityOptions {
  temporal_view?: TemporalViewScalability;
  /** Inherits temporal clipping when omitted, synchronizing both display resets. */
  aggregate_view?: AggregateViewScalability;
}

/** Generic prop-object name for consumers that expose scalability directly. */
export type ScalabilityProps = ScalabilityOptions;

/** Alias used by widget-specific APIs such as SingleSlider. */
export type SingleSliderScalability = ScalabilityOptions;

/** CheckboxGroup uses temporal zoom_in with modes: ["interactions"]. */
export type CheckboxScalability = ScalabilityOptions;

/** Checkbox defaults to manual drag-to-zoom, using the shared slider trigger defaults. */
export const DEFAULT_CHECKBOX_SCALABILITY: CheckboxScalability = {
  temporal_view: {
    strategy: "zoom_in",
    zoom_in_options: {
      modes: ["interactions"],
      visibility: "all-active",
      trigger: {
        type: "interaction",
        threshold: 50,
        auto_zoom: false,
        suggestion: false,
      },
    },
  },
};
