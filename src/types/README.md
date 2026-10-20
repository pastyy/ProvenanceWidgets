# types

- [`components.ts`](./components.ts): public props and types for React widgets.
- [`provenance.ts`](./provenance.ts): shared provenance types and common widget props.
- [`scalability.ts`](./scalability.ts): reusable scalability configuration objects and
  trigger/strategy types.

All seven widgets accept temporal and aggregate clipping through `scalability`.
Each view must configure its own strategy, trigger, and threshold. An omitted
view uses its default behavior and does not inherit the other view. See
[clipping behavior and defaults](../shared/logic/scalability/CLIPPING.md).
Single and range sliders support `aggregate_view.window_options` for a scrollable
value span, using an absolute value as the window start. See
[Slider window semantics](../shared/logic/scalability/WINDOWING.md).
Checkbox zoom accepts the same `zoom_in_options` as sliders for the
`interactions` dimension. `DEFAULT_CHECKBOX_SCALABILITY` describes its manual
brush defaults; explicit props take precedence. See [checkbox zoom](../shared/logic/scalability/ZOOM.md).
