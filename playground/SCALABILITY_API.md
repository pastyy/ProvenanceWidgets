# Widget Scalability API

[Playground](./README.md) · [Project README](../README.md)

This guide describes the current implementation, reviewed on 2026-10-29. Complete
types live in [src/types/scalability.ts](../src/types/scalability.ts).
[scalability_api.json](./scalability_api.json) is a historical design draft containing
comments, pseudo-types, and unimplemented proposals. It is neither valid JSON
nor the authority for current defaults.

## Configuration

```ts
import type { ScalabilityOptions } from "provenance-widgets";

const scalability: ScalabilityOptions = {
  temporal_view: {
    strategy: "zoom_in",
    zoom_in_options: {
      modes: ["interactions"],
      visibility: "all-active",
      trigger: { type: "interaction", threshold: 50, auto_zoom: false },
    },
  },
  aggregate_view: {
    strategy: "clipping",
    clipping_options: {
      trigger: { type: "interaction", threshold: 20 },
    },
  },
};
```

Pass this object as the widget's `scalability` prop. `SingleSliderScalability`,
`CheckboxScalability`, and `ScalabilityProps` alias the shared configuration.

- Views resolve strategies, thresholds, and state independently. An omitted view
  keeps its default behavior and never inherits the other view's configuration.
- Strategies are `zoom_in`, `clipping`, and `smoothing`. An omitted strategy resolves
  to `zoom_in`; actual tools depend on widget support and props such as `temporalBrush`.
- Only the active strategy's options apply. Slider `window_options` are independent.
- Each normalizer defines its defaults; there is no universal numeric default of 10.

## Temporal zoom

`temporal_view.zoom_in_options`:

| Field | Values / default |
| --- | --- |
| `modes` | `interactions`, `values`, `interactions-values`; the shared resolver defaults to all three |
| `visibility` | `all-active` (default), `after-trigger`, `off` |
| `trigger.type` | `interaction` (default) or `time` |
| `trigger.threshold` | 50 interactions or 3600 seconds; normalized to a positive integer |
| `trigger.auto_zoom` | `false` |

Sliders support interaction, value, and two-dimensional zoom. The four categorical
selection widgets use only `interactions`; CheckboxGroup defaults are defined in
`DEFAULT_CHECKBOX_SCALABILITY`. Categorical brushes use linear drag selection,
without threshold-sized compressed history blocks. `temporalBrush={false}` disables
the corresponding tools; `visibility: "off"` shows full history.
See [Temporal zoom](../src/shared/logic/scalability/strategies/zoomin/README.md) for behavior and integration points.

## Clipping

Both views accept the same `clipping_options`, configured independently:

```js
{ trigger: { type: "interaction", threshold: 20 } }
```

- `type` defaults to `interaction`; `time` uses recorded elapsed seconds.
- For either trigger, omitted or invalid thresholds use `max(1, floor(widgetWidth / 10))`.
  Resolution waits for measured width; the default is not a fixed 50, 3600, or 10.
- Exceeding the threshold displays the latest threshold-sized window without deleting
  source provenance or changing the current value.
- Interaction counts exclude baseline and sample records. One multi-selection change
  counts as one interaction.
- Aggregates use records inside the window, retaining the selection state needed at
  its left boundary.

See [Clipping](../src/shared/logic/scalability/strategies/clipping/README.md) for hidden-record
notifications, time modes, and boundary rules.

## Smoothing

Only the two Sliders currently implement `smoothing_options` in both views:

```js
{
  method: { type: "savgol", options: { window_size: 5, degree: 3 } },
  trigger: { type: "interaction", threshold: 50 },
}
```

An omitted method uses the Savitzky-Golay configuration above; a supplied method
requires `type`; algorithm parameters belong in `method.options`. Triggers default to `interaction`, with thresholds of 50 interactions
or 3600 seconds. Both views count recorded events, not distinct aggregate items.

| Method | Parameter defaults | Constraints |
| --- | --- | --- |
| `savgol` | `window_size: 5`, `degree: 3` | Odd integer window ≥ 3; positive integer degree smaller than window |
| `gaussian` | `sigma: 2`, `truncate: 3` | Positive finite numbers |
| `bspline` | `degree: 3`, `smoothing_factor: 0.5`, `knot_spacing: 10` | Integer degree 1–5; strength in [0, 1]; positive finite spacing |

Gaussian/B-spline distances allow fractions: aggregate uses the slider value domain;
temporal uses record order or elapsed seconds. Savgol `window_size` counts numerical
grid samples; `degree` is the polynomial coefficient count, so 3 fits a quadratic.
The vendored filter preserves its original boundary samples. SingleSlider smooths value frequencies or historical
values; RangeSlider smooths interval coverage or historical center and span.
At the threshold, non-interactive curves with recency gradients replace marks and
hitboxes. Earlier interactions remain unchanged. Each view uses at most 2049 numerical
samples and preserves source data. See [Smoothing](../src/shared/logic/scalability/strategies/smoothing/README.md)
for sampling, boundaries, and fitting rules.

## Aggregate windows

Only Sliders implement `aggregate_view.window_options`, independently of strategy:

```js
{ window_size: 20, window_start: 30 }
```

For a 0–100 domain, this displays 30–50. `window_size` is a positive integer value
span; `window_start` is an absolute value defaulting to `min`, not an item count or
zero-based index. Integer `min` and `max` are required. Invalid sizes or fractional
domains show the complete domain. Starts are clamped to `[min, max - window_size]`.
Scrolling does not record provenance. Item paging for other widgets is unimplemented.
See [Aggregate windows](../src/shared/logic/scalability/windowing/README.md).

## Current support

“Integrated” means a widget has an implementation path, not that all browser
interactions and responsive layouts have passed acceptance review.

| Component | Temporal clipping | Aggregate clipping | Temporal zoom | Smoothing in both views | Aggregate window |
| --- | --- | --- | --- | --- | --- |
| SingleSlider (export: `Singleslider`) | Integrated | Integrated | All three dimensions | Integrated | Integrated |
| RangeSlider (export: `Rangeslider`) | Integrated | Integrated | All three dimensions | Integrated | Integrated |
| CheckboxGroup | Integrated | Integrated | interactions | Pending | Pending |
| RadioGroup | Integrated | Integrated | interactions | Pending | Pending |
| SingleSelectDropdown | Integrated | Integrated | interactions | Pending | Pending |
| MultiSelectDropdown | Integrated | Integrated | interactions | Pending | Pending |
| InputText | Integrated | Integrated | Shared Chart path; text-specific semantics need refinement | Pending | Pending |
| SuperProvenanceWidget | Pending | Pending | Pending | Pending | Pending |

Aggregate zoom-in is unimplemented for every component. Types reserve
`zoom_in_options.trigger` fields `interaction`, `time`, `range`,
`threshold`, `tool_visible_before_trigger`, and `auto_zoom_on_trigger` for future work.
The draft's `range` means maximum minus minimum aggregate counts, not the
slider value domain. Its provisional threshold of 10, initially visible tools, and
non-automatic zoom are proposals, not implemented behavior.
Categorical/text smoothing, non-Slider paging, and cross-widget scalability still
require their own data adapters.

## Maintenance and validation

- Widget integration: [widgets](../src/widgets/README.md).
- Categorical zoom: [useCategoricalTemporalScalability.js](../src/shared/hooks/useCategoricalTemporalScalability.js).
- Clipping, smoothing, and windows: [development guide](../src/shared/logic/scalability/DEVELOPMENT.md).
- Regression checks: run `node --test tests/*.test.js` from the repository root; see [project commands](../README.md#development) for builds.

Existing tests cover independent clipping, Slider windows, numerical smoothing,
and SVG rendering. They do not replace per-widget browser
acceptance. Update the API guide and the relevant topic when changing the
API; shared algorithms or types alone do not establish widget integration.
