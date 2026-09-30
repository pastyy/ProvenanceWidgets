# SingleSlider Scalability API

This document defines the `scalability` configuration interface for `SingleSlider`.
Field names and enum values follow `scalability_api.json` in this directory. That
file is an interface draft containing comments and pseudo-type expressions; it is
not strict JSON and cannot be parsed directly as such.

## Configuration overview

`SingleSlider` accepts an optional `scalability` configuration:

```ts
type SingleSliderScalability = {
  temporal_view?: TemporalViewScalability;
  aggregate_view?: AggregateViewScalability;
};
```

`temporal_view` and `aggregate_view` are independent:

- Either view may be configured on its own; an omitted view keeps its default behavior.
- The two views may use different `strategy` values.
- `strategy` is optional and currently defaults to `zoom_in`.
- Only the `*_options` object matching the active `strategy` takes effect. Options for
  other strategies should be ignored, although they may remain in the configuration.

### Default-value rules

- Explicit defaults in the JSON draft take precedence.
- Where the draft specifies `width / k` without defining `k`, use `k = 10`, so the
  default is `width / 10`.
- Numeric fields without any specified default currently use `10`.
- `window_options.window_size` defaults to the total number of items, and
  `window_start` defaults to `0`; these rules take precedence over the generic numeric
  default of `10`.
- Counts, thresholds, and window sizes must be normalized to integers of at least `1`.
  Indices must be non-negative integers and clamped to the available item range.
  Values calculated from `width / 10` follow the same integer conversion and minimum
  rules.

## Temporal view

`temporal_view` controls the time-based and interaction-history view of `SingleSlider`.

```ts
type TemporalViewScalability = {
  strategy?: "zoom_in" | "clipping" | "smoothening";
  zoom_in_options?: TemporalZoomInOptions;
  clipping_options?: ClippingOptions;
  smoothening_options?: SmootheningOptions;
};
```

### Zoom-in

`zoom_in_options` is used when `strategy === "zoom_in"`:

```ts
type TemporalZoomInOptions = {
  zoom_by?: Array<"interactions" | "values" | "rectangle-2d">;
  trigger?: {
    type?: "on_interaction_over" | "on_time_over";
    threshold?: number;
    tool_visible_before_trigger?: boolean;
    auto_zoom_on_trigger?: boolean;
    suggestion_on?: boolean;
  };
};
```

- `zoom_by` selects the zoom dimensions: interaction count (`interactions`), Slider
  values (`values`), or the two-dimensional interaction/value region (`rectangle-2d`).
- It may contain one to three unique options. The default includes all three.
- `trigger.type` defaults to `on_interaction_over`.
- For `on_interaction_over`, `threshold` is an interaction count. For `on_time_over`,
  it is seconds. The interaction threshold defaults to `width / 10`; the time threshold
  uses the explicit JSON default of `3600` seconds.
- `tool_visible_before_trigger` controls whether the zoom tool is shown before the
  threshold and defaults to `true`.
- `auto_zoom_on_trigger` controls whether reaching the threshold automatically zooms
  the view and defaults to `false`.
- `suggestion_on` is meaningful only when automatic zoom is disabled. It controls a
  zoom suggestion with a confirmation button and defaults to `false`.

### Clipping

Used when `strategy === "clipping"`:

```ts
type ClippingOptions = {
  trigger?: {
    type?: "on_interaction_over" | "on_time_over";
    threshold?: number;
  };
};
```

- `trigger.type` defaults to `on_interaction_over`.
- The threshold unit follows the trigger type. The default is `width / 10`.

### Smoothening

Used when `strategy === "smoothening"`:

```ts
type SmootheningOptions = {
  method?: "savgol" | "gaussian" | "bspline";
  trigger?: {
    type?: "on_interaction_over" | "on_time_over";
    threshold?: number;
  };
  window_unit?: "pixel" | "data_domain";
  window_size?: number;
};
```

- `method` defaults to `savgol`.
- `trigger.type` defaults to `on_interaction_over`.
- `trigger.threshold` defaults to `width / 10`.
- `window_unit` defaults to `pixel`: the smoothing window changes with page pixel
  dimensions. `data_domain` defines the window in data-domain units instead.
- `window_size` is the smoothing calculation window and defaults to `width / 10`.

## Aggregate view

`aggregate_view` controls history aggregated by Slider value, such as interaction
counts per value or aggregate bars.

```ts
type AggregateViewScalability = {
  strategy?: "zoom_in" | "clipping" | "smoothening";
  zoom_in_options?: AggregateZoomInOptions;
  clipping_options?: AggregateClippingOptions;
  smoothening_options?: SmootheningOptions;
  window_options?: WindowOptions;
};
```

### Aggregate zoom-in

```ts
type AggregateZoomInOptions = {
  trigger?: {
    type?: "on_interaction_over" | "on_time_over" | "on_range_over";
    threshold?: number;
    tool_visible_before_trigger?: boolean;
    auto_zoom_on_trigger?: boolean;
    suggestion_on?: boolean;
  };
};
```

- `on_interaction_over` triggers when aggregate interaction count exceeds the threshold.
- `on_time_over` triggers after the specified time.
- `on_range_over` triggers when the statistical range of aggregate interaction counts
  exceeds the threshold. Here, range is `max(interactionCount) - min(interactionCount)`,
  not the numeric range of a RangeSlider.
- The draft does not define a default threshold; the current provisional default is `10`.
- `tool_visible_before_trigger`, `auto_zoom_on_trigger`, and `suggestion_on` default to
  `true`, `false`, and `false`, respectively, as in temporal zoom-in.

### Aggregate clipping

```ts
type AggregateClippingOptions = {
  trigger?: {
    type?: "on_interaction_over" | "on_time_over";
    threshold?: number;
  };
};
```

- `trigger.type` defaults to `on_interaction_over`.
- No threshold default is defined in the draft; the current provisional default is `10`.

### Aggregate smoothening

Uses the same `SmootheningOptions` structure as the temporal view:

- `method` defaults to `savgol`.
- `trigger.type` defaults to `on_interaction_over`.
- `trigger.threshold` defaults to `width / 10`.
- `window_unit` defaults to `pixel`.
- No `window_size` default is defined; the current provisional default is `10`.

### Window options

```ts
type WindowOptions = {
  window_size?: number;
  window_start?: number;
};
```

`window_options` belongs under `aggregate_view` but does not depend on its strategy.
It can be used for value-window paging or scrolling with `zoom_in`, `clipping`, or
`smoothening`.

- `window_size` is the number of items shown in the current window. An item may be a
  SingleSlider value or an aggregate value. By default, all items are shown.
- `window_start` is the starting item index and defaults to `0` (the first item).
- A window must stay within item bounds. If `window_start + window_size` exceeds the
  available range, clamp it to the last valid item.
- Windowing only segments the display; it must not discard aggregate data hidden by the
  current window.

## Implementation invariants

1. Temporal and aggregate strategy state must be maintained independently. Switching one
   view must not change the other view's strategy or window.
2. Threshold units must follow `trigger.type` exactly. Seconds must not be interpreted as
   interaction counts, and `on_range_over` must not be treated as a Slider value range.
3. `zoom_by` affects temporal zoom-in only; aggregate zoom-in does not support it.
4. Options that do not match the active strategy must not trigger extra rendering or
   interaction behavior.
5. Smoothing-window unit conversion must use the same pixel/data-domain coordinate basis
   throughout both views.
6. Resolve all defaults during configuration normalization. The rendering layer should
   consume only normalized configuration.
