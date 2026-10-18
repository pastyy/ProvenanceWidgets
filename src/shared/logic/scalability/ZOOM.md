# Checkbox temporal zoom

CheckboxGroup uses the slider `temporal_view.zoom_in_options` contract. It
supports `modes: ["interactions"]`; categorical values do not currently have
numeric value or two-dimensional brush semantics.

```jsx
scalability={{
  temporal_view: {
    strategy: "zoom_in",
    zoom_in_options: {
      modes: ["interactions"],
      visibility: "all-active",
      trigger: {
        type: "interaction",
        threshold: 50,
        auto_zoom: false,
      },
    },
  },
}}
```

Drag directly on the horizontal interaction/time axis to draw a selection.
The temporal bars show that range. Drag the selection to move it, drag its
edges to resize it, or click outside it to clear the selection and restore the
full history. Ticks show interaction positions, or elapsed seconds in time mode.
The brush uses the same colors, opacity, move cursor, and direction-appropriate
resize cursors as the slider brushes.

Manual zoom is available immediately by default. There are no threshold-sized
compressed blocks and no automatic reset when another block is reached.
Explicit `visibility: "after-trigger"` and `trigger.auto_zoom` use the same
shared trigger policy as sliders.
`visibility: "off"` disables the brush and displays the full history.
Interaction triggers default to 50; time triggers default to 3600 seconds.
Changing temporal zoom does not filter aggregate statistics.

Clipping is a different strategy: it renders the clipped temporal and aggregate
views with the timeline hidden by default. Clipping can opt into the selection
widget timeline with `clipping_options.show_timeline: true`. See [clipping](./CLIPPING.md).

After a non-empty zoom selection, a small selected-range axis appears below
all checkbox rows. Its bounds follow the brush and its ticks align with the
history tracks above it. It uses the same axis renderer as slider zoom, with
interaction positions or elapsed seconds according to the mode. Clearing the
selection hides this secondary axis. It does not affect clipping or aggregate
views.
