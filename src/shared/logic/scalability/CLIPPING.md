# Display clipping for selection widgets

`CheckboxGroup`, `RadioGroup`, `SingleSelectDropdown`, and `MultiSelectDropdown`
share the same clipping implementation. InputText and numeric sliders do not
use this path.

```jsx
const scalability = {
  temporal_view: {
    strategy: "clipping",
    clipping_options: {
      trigger: { type: "on_interaction_over", threshold: 20 },
    },
  },
  aggregate_view: {
    strategy: "clipping",
    clipping_options: {
      trigger: { type: "on_time_over", threshold: 30 },
    },
  },
};

<RadioGroup scalability={scalability} {...props} />
```

Each widget can receive its own object. Each view has its own strategy and
trigger: enabling aggregate clipping does not enable temporal clipping, and
vice versa. Explicit clipping props also take precedence over CheckboxGroup's
existing centralized zoom configuration.

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
compressing them into a brush region. The interaction axis progresses from
`n=0` to `n=20`, `n=40`, etc.; its right label keeps the cumulative count, such
as `now (21)`. Time-mode labels use elapsed seconds instead. The brush only
selects within the current display period and resets to its full range when a
new period begins.

Aggregate clipping resets displayed frequencies and recency. It counts only
selection/deselection changes in the current period. An option that remains
selected across a boundary is not counted as newly selected just because the
view was reset. Current selected values remain unchanged.

Both views are empty at an exact reset boundary. Original serialized
provenance, registration, export, and global history restoration are preserved.
Selecting a visible temporal bar resolves against the displayed period.

## Implementation

- `core/normalizeClippingConfig.js`: shared view configuration and width default.
- `triggers/clipping.js`: threshold-boundary calculation.
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
