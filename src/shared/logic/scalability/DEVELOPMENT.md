# Scalability Development Guide

This directory contains reusable scalability logic for temporal and aggregate
views. It is intentionally independent from React, D3 rendering, and concrete
widget components.

## Structure

- `core/`: configuration normalization and public defaults.
- `triggers/`: threshold and visibility decisions.
- `strategies/`: strategy algorithms such as `zoomIn`, `clipping`, and
  `smoothening`.
- `views/`: view-specific orchestration for temporal and aggregate domains.
- `adapters/`: conversion between widget data contracts and scalability input
  contracts.
- `math/`: small pure numeric helpers shared by strategies.
- `index.js`: stable public entry point for shared scalability functions.

## Rules

1. Keep modules pure whenever possible. A logic module must not import React,
   browser globals, D3 selections, or widget components.
2. Keep configuration parsing in `core/`; do not read raw `scalability` objects
   inside a strategy implementation.
3. Keep trigger decisions separate from rendering. A trigger function returns
   a decision; the widget decides how to present that decision.
4. Put temporal and aggregate differences in `views/` or strategy modules, not
   in a growing conditional inside `index.js`.
5. Widget-specific value conversion belongs in `adapters/`. For example,
   slider `step` snapping must not be embedded in a generic temporal renderer.
6. Add a focused test for every new default, trigger rule, or strategy edge
   case. Prefer pure-function tests over component snapshots.
7. Export new shared functions from `index.js`. Consumers should not depend on
   deep implementation paths unless they own that module.

## Dependency Direction

```text
core / math
       ^
triggers / strategies
       ^
views / adapters
       ^
widget renderers
```

Lower layers must not import higher layers. In particular, scalability logic
must not import `Chart`, `SingleSlider`, or `RangeSlider`.

## Adding a Strategy

Create a focused module under `strategies/<strategy>/`, define its input and
output contract, add pure-function tests, and export it through `index.js`.
Only then connect it from a temporal or aggregate view adapter and a widget
renderer.
