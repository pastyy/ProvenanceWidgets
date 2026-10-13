# types

- [`components.ts`](./components.ts): public props and types for React widgets.
- [`provenance.ts`](./provenance.ts): shared provenance types and common widget props.
- [`scalability.ts`](./scalability.ts): reusable scalability configuration objects and
  trigger/strategy types.

All seven widgets accept temporal and aggregate clipping through `scalability`.
When `aggregate_view` is omitted, it inherits temporal clipping so both views
reset at the same threshold. Explicit aggregate settings override inheritance. See
[clipping behavior and defaults](../shared/logic/scalability/CLIPPING.md).
`DEFAULT_CHECKBOX_SCALABILITY` configures the existing checkbox zoom path;
explicit clipping props use the shared implementation instead.
