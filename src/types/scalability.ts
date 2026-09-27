export type ScalabilityStrategy =
  | "zoom_in"
  | "clipping"
  | "smoothening";

export type TemporalScalabilityTriggerType =
  | "on_interaction_over"
  | "on_time_over";

export type AggregateScalabilityTriggerType =
  | TemporalScalabilityTriggerType
  | "on_range_over";

export type ScalabilityZoomBy =
  | "interactions"
  | "values"
  | "rectangle-2d";

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

export interface TemporalScalabilityZoomInOptions {
  /** One or more dimensions to use for temporal zooming. */
  zoom_by?: ScalabilityZoomBy[];
  trigger?: ScalabilityZoomTrigger<TemporalScalabilityTriggerType>;
}

export interface AggregateScalabilityZoomInOptions {
  trigger?: ScalabilityZoomTrigger<AggregateScalabilityTriggerType>;
}

export interface ScalabilityClippingOptions<
  TType extends string = TemporalScalabilityTriggerType,
> {
  trigger?: ScalabilityThresholdTrigger<TType>;
}

export type TemporalScalabilityClippingOptions =
  ScalabilityClippingOptions<TemporalScalabilityTriggerType>;

export type AggregateScalabilityClippingOptions =
  ScalabilityClippingOptions<TemporalScalabilityTriggerType>;

export type ScalabilitySmootheningMethod =
  | "savgol"
  | "gaussian"
  | "bspline";

export type ScalabilityWindowUnit = "pixel" | "data_domain";

export interface ScalabilitySmootheningOptions {
  method?: ScalabilitySmootheningMethod;
  trigger?: ScalabilityThresholdTrigger<TemporalScalabilityTriggerType>;
  window_unit?: ScalabilityWindowUnit;
  window_size?: number;
}

export interface ScalabilityWindowOptions {
  /** Number of aggregate items visible in the current window. */
  window_size?: number;
  /** Zero-based index of the first aggregate item in the window. */
  window_start?: number;
}

export interface TemporalViewScalability {
  strategy?: ScalabilityStrategy;
  zoom_in_options?: TemporalScalabilityZoomInOptions;
  clipping_options?: TemporalScalabilityClippingOptions;
  smoothening_options?: ScalabilitySmootheningOptions;
}

export interface AggregateViewScalability {
  strategy?: ScalabilityStrategy;
  zoom_in_options?: AggregateScalabilityZoomInOptions;
  clipping_options?: AggregateScalabilityClippingOptions;
  smoothening_options?: ScalabilitySmootheningOptions;
  /** Applies to aggregate_view regardless of the selected strategy. */
  window_options?: ScalabilityWindowOptions;
}

export interface ScalabilityOptions {
  temporal_view?: TemporalViewScalability;
  aggregate_view?: AggregateViewScalability;
}

/** Generic prop-object name for consumers that expose scalability directly. */
export type ScalabilityProps = ScalabilityOptions;

/** Alias used by widget-specific APIs such as SingleSlider. */
export type SingleSliderScalability = ScalabilityOptions;
