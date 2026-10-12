# types

- [`components.ts`](./components.ts): public props and types for React widgets.
- [`provenance.ts`](./provenance.ts): shared provenance types and common widget props.
- [`scalability.ts`](./scalability.ts): reusable scalability configuration objects and
  trigger/strategy types.

Selection widgets accept independent `temporal_view` and `aggregate_view`
clipping settings through their `scalability` prop. See
[clipping behavior and defaults](../shared/logic/scalability/CLIPPING.md).
`DEFAULT_CHECKBOX_SCALABILITY` configures the existing checkbox zoom path;
explicit clipping props use the shared implementation instead.
