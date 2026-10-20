# Display clipping for widgets

All seven widgets share temporal and aggregate clipping: `CheckboxGroup`, `RadioGroup`,
`SingleSelectDropdown`, `MultiSelectDropdown`, `InputText`, `Singleslider`, and
`Rangeslider`. Temporal and aggregate views are configured independently.

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

Each widget can receive its own object. Each view uses only its own configuration;
configure `aggregate_view` explicitly to clip aggregate history. An omitted view
uses its default behavior. Neither view inherits the other's strategy, trigger,
or threshold.

## Rolling window behavior

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
- After the threshold is exceeded, the window advances on every interaction.
  With threshold 10, total counts 15, 16, and 17 give bounds 5–15, 6–16,
  and 7–17. The left bound is the cutoff: at 15, the ten interactions 6–15
  contribute to aggregate statistics; temporal selection intervals can carry
  their existing state across the left edge.
- Time triggers keep the latest threshold seconds of recorded history.
- Imported history uses the same rolling window. Reaching an exact multiple
  of the threshold no longer clears the view.

## What changes on screen

Temporal clipping displays the current window without the legacy selection-widget
timeline. Temporal marks and aggregate bars remain visible and interactive.
For elapsed-time labels, use `mode="time"`; the trigger type still determines
whether the window covers interactions or recorded seconds.

Aggregate statistics count only interactions inside the window. Selection
state at its left edge is retained to compute deltas, without being counted
as a new selection. Current widget values and full source history are preserved.

Checkbox, radio, single-select and multi-select groups show a contrasting dot
at the footprint icon's bottom-right whenever the **displayed view** clips older
history. Aggregate clipping works independently of temporal zoom. Switching to
an unclipped view hides the dot. The dot uses the same bright yellow (`#FFD600`) for every widget, with a
2px white border and no dark outer outline or shadow.
Hovering or focusing it shows the hidden interaction count. The dot remains
visible after clicking, does not toggle views, and suppresses the footprint
help tooltip while hovered or focused. With threshold 10, the eleventh
interaction shows `1 interaction hidden`.

All four categorical widgets share the checkbox linear drag-selection zoom
brush, trigger behavior, and selected-range axis.

For sliders and text input, the notification stays visible whenever older history is hidden, including
imported history. At 15 interactions with threshold 10, it reads
`hide 5 interacts`; at 16 it reads `hide 6 interacts`. It disappears when clipping
is disabled or no history is hidden. Synchronized temporal/aggregate windows
produce one notice. Time-trigger notices use seconds.

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
export and restoration. Checkbox zoom uses a linear drag-selection brush;
threshold-based history compression has been removed.

Clipping is implemented entirely in the library's `src/` directory. Callers
choose the view configuration through `scalability`; the library does not depend
on playground configuration or demo data.
