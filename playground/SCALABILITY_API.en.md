# Widget Scalability API

This document defines the shared `scalability` configuration contract for the seven
playground widgets and `SuperProvenanceWidget`. The existing SingleSlider proposal
provides the foundation. Every component requires both temporal and aggregate
scalability plans.
Field names and enum values follow `scalability_api.json` in this directory. That
file is an interface draft containing comments and pseudo-type expressions; it is
not strict JSON and cannot be parsed directly as such.

This is the development target, rather than a claim that all components already
implement every option. See the progress table below for current integration.
Differences in data semantics, strategy behavior, applicable parameters, and
defaults will be documented while developing each component. Unresolved details
remain open until that work.

## Configuration overview

The target interface for every component uses an optional `scalability`
configuration with the same base structure:

```ts
type ScalabilityOptions = {
  temporal_view?: TemporalViewScalability;
  aggregate_view?: AggregateViewScalability;
};
```

`SingleSliderScalability` is an existing alias for this shared configuration.
Other components use the same base structure and may add documented extensions
when needed. `SuperProvenanceWidget` is included in this target interface: its
configuration applies to views across components, while child widget
configurations apply to their own views. Coordination rules will be defined
during its development. SuperProvenance does not currently integrate the
`scalability` prop.

`temporal_view` and `aggregate_view` are independent:

- Either view may be configured on its own; an omitted view keeps its default behavior.
- The two views may use different `strategy` values.
- `strategy` is optional and currently defaults to `zoom_in`.
- Only the `*_options` object matching the active `strategy` takes effect. Options for
  other strategies should be ignored, although they may remain in the configuration.

### Strategy scope and component differences

- Both views of every component require plans for the three baseline strategies:
  `clipping`, `zoom_in`, and `smoothing`. Additional strategies may be added later,
  with corresponding updates to enums, option documentation, and the progress table.
- Sharing a configuration structure does not require identical algorithms. Continuous
  slider values, discrete selection options, InputText strings, and SuperProvenance
  states across components require their own data adaptation and presentation.
- Document component differences during development, including zoom dimensions,
  clipping units, smoothing targets, aggregate items, trigger metrics, and defaults.
  Numeric curve smoothing must not be applied directly to category labels or text.
- When a shared parameter is inapplicable, document the limitation or alternative in
  that component's notes. Keep the task in the table and record the decision rather
  than omitting it because it is unimplemented.

### Default-value rules

- Explicit defaults in the JSON draft take precedence.
- Where the draft specifies `width / k` without defining `k`, use `k = 10`, so the
  default is `width / 10`.
- Numeric fields without any specified default currently use `10`.
- `window_options.window_size` defaults to the total number of items, and
  `window_start` defaults to `0`; these rules take precedence over the generic numeric
  default of `10`.
- Counts, thresholds, and display-window sizes must be normalized to integers of at least `1`.
  Indices must be non-negative integers and clamped to the available item range.
  Values calculated from `width / 10` follow the same integer conversion and minimum
  rules.
- Smoothing method parameters follow the defaults and constraints in the Smoothing
  section, rather than the generic numeric default or integer conversion above.

## Temporal view

`temporal_view` controls the current component's time-based and interaction-history
view. For SuperProvenance, it controls history across components.

```ts
type TemporalViewScalability = {
  strategy?: "zoom_in" | "clipping" | "smoothing";
  zoom_in_options?: TemporalZoomInOptions;
  clipping_options?: ClippingOptions;
  smoothing_options?: SmoothingOptions;
};
```

### Zoom-in

`zoom_in_options` is used when `strategy === "zoom_in"`:

```ts
type TemporalZoomInOptions = {
  modes?: Array<"interactions" | "values" | "interactions-values">;
  visibility?: "all-active" | "after-trigger" | "off";
  trigger?: {
    type?: "interaction" | "time";
    threshold?: number;
    auto_zoom?: boolean;
    suggestion?: boolean;
  };
};
```

- `modes` selects the zoom dimensions: interactions (`interactions`), values
  (`values`), or the two-dimensional interaction/value region (`interactions-values`).
  SingleSlider's value dimension represents slider values. Other components' value
  dimensions and applicable modes will be defined during development.
- It may contain one to three unique options. The shared draft defaults to all three;
  any component-specific restriction on supported modes must be documented.
- `visibility` defaults to `all-active`. `after-trigger` activates the tools only after
  the threshold is reached, while `off` disables them.
- `trigger.type` defaults to `interaction`.
- For `interaction`, `threshold` is an interaction count and defaults to `50`. For
  `time`, it is seconds and defaults to `3600`.
- `auto_zoom` controls whether reaching the threshold automatically zooms
  the view and defaults to `false`.
- `suggestion` is meaningful only when automatic zoom is disabled. It controls a
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
- The threshold unit follows the trigger type. For `on_interaction_over`, it is an
  interaction count and defaults to `50`. For `on_time_over`, it is seconds and
  defaults to `3600`.

### Smoothing

Used when `strategy === "smoothing"`:

```ts
type SmoothingOptions = {
  method?:
    | {
        type: "savgol";
        window_length?: number;
        polyorder?: number;
      }
    | {
        type: "gaussian";
        sigma?: number;
        truncate?: number;
      }
    | {
        type: "bspline";
        degree?: number;
        smoothing_factor?: number;
        knot_spacing?: number;
      };
  trigger?: {
    type?: "interaction" | "time";
    threshold?: number;
  };
};
```

- `method` defaults to `{ type: "savgol", window_length: 9, polyorder: 2 }`.
- Smoothing distances always use `data_domain`; no unit field is exposed.
  Order, degree, `truncate`, and `smoothing_factor` are dimensionless.
- `trigger.type` defaults to `interaction`.
- `trigger.threshold` defaults to `50` interaction events for `interaction` and
  `3600` seconds for `time`.
- Savitzky-Golay defaults to `window_length: 9` and `polyorder: 2`.
- Gaussian defaults to `sigma: 2` and `truncate: 3`.
- B-spline defaults to `degree: 3`, `smoothing_factor: 0.5`, and
  `knot_spacing: 10`.
- A supplied `method` requires its `type`; every other method field is optional
  and uses the corresponding default above when omitted.

| Method parameter | Meaning | Default | Constraint |
| --- | --- | --- | --- |
| `savgol.window_length` | Total width of the local fitting window in data-domain units | `9` | Positive finite number; fractional widths are allowed |
| `savgol.polyorder` | Local polynomial order | `2` | Non-negative integer |
| `gaussian.sigma` | Standard deviation in data-domain units | `2` | Positive finite number |
| `gaussian.truncate` | Support radius in multiples of `sigma`; actual radius is `truncate * sigma` | `3` | Positive finite number |
| `bspline.degree` | Spline degree; `3` means cubic | `3` | Integer from `1` to `5` |
| `bspline.smoothing_factor` | Normalized smoothing strength; larger values mean stronger smoothing | `0.5` | Finite number in `[0, 1]` |
| `bspline.knot_spacing` | Distance between interior knots in data-domain units | `10` | Positive finite number |

- Savitzky-Golay adapters convert `window_length` through the documented
  data-domain sampling grid to an odd sample count greater than `polyorder`;
  it does not specify a pixel width or a raw sample count. If there are too few
  samples for the configured order, leave that segment unsmoothed.
- `smoothing_factor` is this API's normalized control, not a fitting library's
  raw residual bound. The Slider coefficient-curvature penalty mapping is
  documented in [SMOOTHING.md](../src/shared/logic/scalability/SMOOTHING.md).
- Missing or invalid method numbers use the documented defaults. Fractional
  distances must not be rounded to integers. The method defaults are starting
  values in the component's documented domain, not percentages of domain width.
- Triggers count recorded interaction events for `interaction` and recorded
  elapsed seconds for `time`; aggregate triggers do not count distinct items.
- Each component defines the data to smooth. These numeric methods do not mean
  smoothing category labels or text directly; the adaptation will be specified
  during that component's development.

## Aggregate view

`aggregate_view` controls the current component's aggregate history. SingleSlider
counts interactions per numeric value. RangeSlider aggregate smoothing uses the
number of recorded intervals covering each numeric value. Selection widgets may
aggregate by option. Aggregate items and metrics for InputText and SuperProvenance
will be defined during their development.

```ts
type AggregateViewScalability = {
  strategy?: "zoom_in" | "clipping" | "smoothing";
  zoom_in_options?: AggregateZoomInOptions;
  clipping_options?: AggregateClippingOptions;
  smoothing_options?: SmoothingOptions;
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

### Aggregate smoothing

Uses the same `SmoothingOptions` structure as the temporal view:

- `method` defaults to `{ type: "savgol", window_length: 9, polyorder: 2 }`.
- Smoothing distances use the aggregate data domain. Dimensionless parameters,
  constraints, and default rules are the same as in the Smoothing section.
- `trigger.type` defaults to `interaction`.
- `trigger.threshold` defaults to `50` interaction events for `interaction` and
  `3600` seconds for `time`.
- Savitzky-Golay defaults to `window_length: 9` and `polyorder: 2`.
- Gaussian defaults to `sigma: 2` and `truncate: 3`.
- B-spline defaults to `degree: 3`, `smoothing_factor: 0.5`, and
  `knot_spacing: 10`.
- SingleSlider and RangeSlider implement `savgol`, `gaussian`, and `bspline`. The smoothed
  curve is overlaid on the existing bars and uses the same x and count scales.
  Unsupported methods do not fall back to Savitzky-Golay.
- SingleSlider smooths frequency by numeric value, including zero-frequency
  values. RangeSlider smooths interval coverage, not endpoint frequencies.
- Sampling follows the Slider data domain and `step`, independent of pixel width,
  with a maximum of 2,049 numerical samples. Reduced grids average their source
  bins. Savitzky-Golay boundary points use shifted full-window polynomial fits.
- Gaussian renormalizes the available kernel at boundaries. B-spline uses a
  clamped basis and penalized least squares; `smoothing_factor: 0` is an
  unpenalized fit and `1` is the best least-squares line. Dense requested knots
  are capped to keep the system identifiable.
- See [Slider aggregate smoothing semantics](../src/shared/logic/scalability/SMOOTHING.md).

### Window options

```ts
type WindowOptions = {
  window_size?: number;
  window_start?: number;
};
```

`window_options` belongs under `aggregate_view` but does not depend on its strategy.
It can be used for value-window paging or scrolling with `zoom_in`, `clipping`, or
`smoothing`.

- `window_size` is the number of items shown in the current window. Items may be
  numeric values, options, or other component-defined aggregate items; SingleSlider
  values are one example. By default, all items are shown.
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
3. `modes` affects temporal zoom-in only; aggregate zoom-in does not support it.
4. Options that do not match the active strategy must not trigger extra rendering or
   interaction behavior.
5. Smoothing distances and sampling conversions must follow the component's documented
   data domain, independent of pixel width. If the views use different domains, document
   their meanings separately rather than mixing them implicitly.
6. Resolve all defaults during configuration normalization. The rendering layer should
   consume only normalized configuration.

## Development progress

The table covers the seven playground widgets plus SuperProvenance, tracking
component × view × strategy. There are currently 8 × 2 × 3 = 48 baseline strategy
tasks. Both temporal and aggregate plans must be completed for each component;
add columns when introducing strategies. `aggregate_view.window_options` is not
a separate strategy; track it in the aggregate row's notes.

Statuses: `Pending` = the corresponding configuration is not integrated;
`In progress` = active development; `Partial` = some behavior exists, but API
capabilities remain unintegrated; `Implemented (unverified)` = corresponding
integration code exists, but acceptance verification is outstanding; `Verified`
= the component/view/strategy has passed verification, with evidence recorded.
A draft, type declaration, or shared algorithm alone does not establish widget
integration.

Initial statuses reflect inspection of the workspace on 2026-10-12. Slider
aggregate smoothing now has focused numerical tests and desktop/mobile rendering
checks, but remains `Implemented (unverified)` until click and keyboard acceptance
checks are completed.

| Component | View | clipping | zoom_in | smoothing | Notes / differences to specify |
| --- | --- | --- | --- | --- | --- |
| SingleSlider (exported as `Singleslider`) | temporal | Pending | Implemented (unverified) | Pending | Passes configuration to Chart for interaction, value, and 2D zoom; clipping is not integrated. |
| SingleSlider | aggregate | Pending | Pending | Implemented (unverified) | All three smoothing methods overlay frequency by value after their configured trigger; window_options remain pending. |
| RangeSlider (exported as `Rangeslider`) | temporal | Pending | Implemented (unverified) | Pending | Reuses Chart zoom configuration; specify interval endpoint and 2D selection semantics during development and acceptance. |
| RangeSlider | aggregate | Pending | Pending | Implemented (unverified) | All three smoothing methods overlay interval-coverage counts after their configured trigger; window_options remain pending. |
| CheckboxGroup | temporal | Partial | Partial | Pending | Clipping supports only on_interaction_over in interaction mode; existing zoom_in retains the basic brush without reading zoom_in_options. |
| CheckboxGroup | aggregate | Pending | Pending | Pending | Define option / selection-combination aggregation; integrate strategies and window_options. |
| RadioGroup | temporal | Partial | Partial | Pending | Clipping supports only on_interaction_over in interaction mode; existing zoom_in retains the basic brush without reading zoom_in_options. |
| RadioGroup | aggregate | Pending | Pending | Pending | Aggregation by option; strategies and window_options await integration. |
| InputText | temporal | Pending | Pending | Pending | Does not pass scalability to Chart; define zoom and smoothing semantics for text values. |
| InputText | aggregate | Pending | Pending | Pending | Define text aggregation; develop strategies and window_options. |
| SingleSelectDropdown | temporal | Partial | Partial | Pending | Clipping supports only on_interaction_over in interaction mode; existing zoom_in retains the basic brush without reading zoom_in_options. |
| SingleSelectDropdown | aggregate | Pending | Pending | Pending | Aggregation by option; strategies and window_options await integration. |
| MultiSelectDropdown | temporal | Partial | Partial | Pending | Clipping supports only on_interaction_over in interaction mode; existing zoom_in retains the basic brush without reading zoom_in_options. |
| MultiSelectDropdown | aggregate | Pending | Pending | Pending | Define option / selection-combination aggregation; integrate strategies and window_options. |
| SuperProvenanceWidget | temporal | Pending | Pending | Pending | No scalability integration; define events and states across components and coordination with child widgets. |
| SuperProvenanceWidget | aggregate | Pending | Pending | Pending | Define aggregation across components; develop strategies and window_options. |

Code evidence for the current statuses:

- Slider configuration forwarding and temporal zoom-in:
  [SingleSlider.js](../src/widgets/SingleSlider.js),
  [RangeSlider.js](../src/widgets/RangeSlider.js), and [Chart.js](../src/widgets/Chart.js).
- Slider aggregate smoothing:
  [sliderAggregateSmoothing.js](../src/shared/logic/scalability/views/sliderAggregateSmoothing.js),
  [SMOOTHING.md](../src/shared/logic/scalability/SMOOTHING.md), and
  [sliderAggregateSmoothing.test.js](../tests/sliderAggregateSmoothing.test.js).
- Strategy dispatch and current limitations for the four selection widgets:
  [selectionTemporal.js](../src/shared/logic/scalability/views/selectionTemporal.js)
  and [CLIPPING.md](../src/shared/logic/scalability/CLIPPING.md).
- Components without configuration integration:
  [InputText.js](../src/widgets/InputText.js) and
  [SuperProvenanceWidget.js](../src/widgets/SuperProvenanceWidget.js).

When developing a component, document its API differences and update the relevant
strategy statuses and notes. Record test or playground acceptance evidence when
marking a task `Verified`. After implementing shared capabilities, confirm
integration for each component before marking its tasks complete.
