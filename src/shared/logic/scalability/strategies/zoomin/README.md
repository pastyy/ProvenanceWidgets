# Temporal zoom

[Scalability API](../../../../../../playground/SCALABILITY_API.md) · [Source layout](../../../../../README.md)

Sliders support `interactions`, `values`, and `interactions-values` dimensions
through [Chart.js](../../../../../widgets/Chart.js) and its brush helpers. The shared
configuration is described in the [API guide](../../../../../../playground/SCALABILITY_API.md#temporal-zoom).

## Categorical selection widgets

CheckboxGroup, RadioGroup, SingleSelectDropdown, and MultiSelectDropdown use
[useCategoricalTemporalScalability.js](../../../../hooks/useCategoricalTemporalScalability.js).
They share the slider `temporal_view.zoom_in_options` contract and support `modes: ["interactions"]`; categorical values do not currently have
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
views without the legacy selection-widget timeline. See [clipping](../clipping/README.md).

After a non-empty zoom selection, a small selected-range axis appears below
the categorical rows. Its bounds follow the brush and its ticks align with the
history tracks above it. It uses the same axis renderer as slider zoom, with
interaction positions or elapsed seconds according to the mode. Clearing the
selection hides this secondary axis. It does not affect clipping or aggregate
views.

## Implementation

- [config.js](./config.js): modes, visibility, and trigger defaults.
- [autoZoom.js](./autoZoom.js): automatic zoom decisions.
- [TemporalZoomBrush.js](../../../../components/TemporalZoomBrush.js): categorical drag selection.
- [CheckboxZoomAxis.js](../../../../components/CheckboxZoomAxis.js): selected-range axis.

InputText forwards configuration to Chart, but slider value and two-dimensional
zoom semantics do not define a complete text-specific zoom contract.
Aggregate zoom-in remains unimplemented; aggregate scrolling is described in
[Aggregate windows](../../windowing/README.md).
