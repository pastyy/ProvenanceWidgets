# Temporal clipping for selection widgets

CheckboxGroup, RadioGroup, SingleSelectDropdown, and MultiSelectDropdown use
the same `scalability` attribute to opt into temporal interaction clipping:

```jsx
const scalability = {
  temporal_view: {
    strategy: "clipping",
    clipping_options: {
      trigger: { type: "on_interaction_over", threshold: 50 },
    },
  },
};

<RadioGroup scalability={scalability} {...props} />
```

The same object works on the other three selection widgets. Without it, their
existing temporal display remains unchanged. Clipping starts after the 50th
interaction by default, advances in threshold-sized blocks, and affects only
the interaction-mode temporal view. The history remains available when the
brush enters the compressed region; aggregate data is unchanged. The axis
compression percentage is an experimental constant in
`strategies/clipping/interactionAxis.js`.

Configuration normalization lives in `core/`, the threshold decision in
`triggers/`, the axis algorithm in `strategies/clipping/`, and the temporal
contract in `views/`. `adapters/selectionTimeline.js` converts selection
provenance records for the shared timeline renderer. React brush state and
events are handled by `useSelectionTemporalScalability` outside the pure logic
directory.

For selection widgets, `views/selectionTemporal.js` selects the temporal
strategy from the object. Only `strategy: "clipping"` reads `clipping_options`;
`zoom_in_options`, `smoothening_options`, and `aggregate_view` do not affect
this interaction-clipping path. Numeric sliders and text input require a
separate adapter and are outside this first selection-widget implementation.

`on_time_over` and aggregate-view clipping are not implemented by this
interaction-axis strategy.
