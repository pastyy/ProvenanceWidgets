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
  `clipping`, `zoom_in`, and `smoothening`. Additional strategies may be added later,
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
- Counts, thresholds, and window sizes must be normalized to integers of at least `1`.
  Indices must be non-negative integers and clamped to the available item range.
  Values calculated from `width / 10` follow the same integer conversion and minimum
  rules.

## Temporal view

`temporal_view` controls the current component's time-based and interaction-history
view. For SuperProvenance, it controls history across components.

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
- Each component defines the data to smooth. These numeric methods do not mean
  smoothing category labels or text directly; the adaptation will be specified
  during that component's development.

## Aggregate view

`aggregate_view` controls the current component's aggregate history. For example,
SingleSlider may count interactions per numeric value, while selection widgets
may aggregate by option. Aggregate items and metrics for InputText, RangeSlider,
and SuperProvenance will be defined during their development.

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
5. Smoothing-window unit conversion must follow the component's documented data domain
   and coordinate mapping. If the views use different domains, document their units
   separately rather than mixing them implicitly.
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

Initial statuses reflect inspection of the current workspace on 2026-10-12.
This documentation update did not include runtime acceptance checks, so no task
is marked `Verified`.

| Component | View | clipping | zoom_in | smoothening | Notes / differences to specify |
| --- | --- | --- | --- | --- | --- |
| SingleSlider (exported as `Singleslider`) | temporal | Pending | Implemented (unverified) | Pending | Passes configuration to Chart for interaction, value, and 2D zoom; clipping is not integrated. |
| SingleSlider | aggregate | Pending | Pending | Pending | Aggregation by value; strategies and window_options await integration. |
| RangeSlider (exported as `Rangeslider`) | temporal | Pending | Implemented (unverified) | Pending | Reuses Chart zoom configuration; specify interval endpoint and 2D selection semantics during development and acceptance. |
| RangeSlider | aggregate | Pending | Pending | Pending | Define interval aggregation; develop strategies and window_options. |
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
