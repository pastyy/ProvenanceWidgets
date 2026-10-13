# Display clipping for widgets

All seven widgets share temporal and aggregate clipping: `CheckboxGroup`, `RadioGroup`,
`SingleSelectDropdown`, `MultiSelectDropdown`, `InputText`, `Singleslider`, and
`Rangeslider`. By default, aggregate inherits temporal clipping so both views
reset together using one threshold.

```jsx
const scalability = {
  temporal_view: {
    strategy: "clipping",
    clipping_options: {
      trigger: { type: "on_interaction_over", threshold: 20 },
    },
  },
};

<RadioGroup scalability={scalability} {...props} />
```

Each widget can receive its own object. If `aggregate_view` is omitted,
it inherits `temporal_view` when that view uses clipping, including its trigger
and threshold. An explicit `aggregate_view` overrides this inheritance and
can use a different threshold or strategy. Aggregate-only clipping does not
enable temporal clipping. Explicit clipping props also take precedence over
CheckboxGroup's existing centralized zoom configuration.

## Trigger and reset behavior

- `type` defaults to `on_interaction_over`.
- `threshold` is a positive integer. When omitted or invalid it defaults to
  `max(1, floor(widgetWidth / 10))`, using the widget's CSS pixel width. The hook
  waits for layout before applying this default and observes width changes.
- Interaction triggers count records with `kind: "interaction"`. Baseline and
  time-sampling records do not increase the count. One multi-selection change
  counts as one interaction, regardless of how many options changed.
- `on_time_over` measures elapsed **seconds in the recorded history**, including
  time samples. In `mode="time"`, the existing controller's sampling advances
  that span while idle; in interaction mode it advances when history changes.
  Importing old history does not count the wall-clock gap since it was recorded.
- A display resets **at** the threshold, then at each multiple of it. For a
  threshold of 20, interactions 20, 40, 60, etc. clear the display. Interaction
  21 starts the next display period; this is not a rolling window of 20 records.
- Imported history skips completed periods in the same way. With 45 interaction
  records and threshold 20, only interactions 41–45 contribute to that view.

## What changes on screen

Temporal clipping removes older intervals from the display rather than
compressing them into a brush region. Selection and text axes progress from
`n=0` to `n=20`, `n=40`, etc.; the endpoint keeps the cumulative count, such
as `now (21)`. Time-mode labels use elapsed seconds instead. The two numeric
sliders retain their normal per-interaction numeric ticks and point spacing;
clipping does not replace their axis with threshold/now labels. Selection-widget brushes only select within the current display period and
reset to their full range when a new period begins. Text and numeric temporal
views display the current period on a fixed axis; zoom tools are inactive while
clipping is selected.

Aggregate clipping resets displayed frequencies and recency. Text suggestions,
numeric frequencies, and range coverage use only interactions after the reset.
For selection widgets, it counts only selection/deselection changes in the
current period: an option that stays selected across a boundary is not counted
as newly selected just because the view was reset. Current values stay unchanged.

When a widget crosses a new clipping boundary, it briefly announces
`hide 20 interacts` (using its configured threshold), then dismisses the notice
after three seconds. Synchronized temporal/aggregate resets announce only once.
An initial imported history does not replay old notifications. Time triggers
use `seconds` in the notice.

Both views are empty at an exact reset boundary. Original serialized
provenance, registration, export, and global history restoration are preserved.
Selecting a visible temporal bar resolves against the displayed period.

## Implementation

- `core/normalizeClippingConfig.js`: shared view configuration and width default.
- `triggers/clipping.js`: threshold-boundary calculation.
- `views/clippingPeriod.js`: shared cutoff, cumulative counts, and axis labels.
- `views/recordTemporal.js`: text/numeric temporal records and axis positions.
- `views/recordAggregate.js`: text/numeric frequencies for the current period.
- `views/selectionTemporal.js`: display projections for aggregate and temporal.
- `shared/hooks/useSelectionTemporalScalability.js`: width measurement and brush
  state shared by all four widgets.

Components pass their records and `scalability` attributes into the shared
hook and render its display strategies. Source strategies stay registered for
export and restoration. The older `strategies/clipping/interactionAxis.js`
compressed-axis helpers remain used by checkbox **zoom**, not by reset clipping.

Clipping is implemented entirely in the library's `src/` directory. Callers
choose the view configuration through `scalability`; the library does not depend
on playground configuration or demo data.
