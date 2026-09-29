# Additive checkbox temporal clipping

This extension leaves the original widget implementations unchanged. It adds
sibling variants of CheckboxGroup, Checkbox, TimelineVis and TemporalRangeSlider
to preserve their existing selection/registration/aggregate behavior while
changing temporal presentation. These copies need to be kept in sync explicitly
if the upstream components change. No existing directory is moved or renamed.

## Use

Import directly from source (adjust the relative path for your application):

```jsx
import ClippedCheckboxGroup from "./src/widgets/ClippedCheckboxGroup.js";

<ClippedCheckboxGroup
  id="meat"
  data={["Chicken", "Beef", "Lamb"]}
  mode="interaction"
  scalability={{
    temporal_view: {
      strategy: "clipping",
      clipping_options: {
        trigger: { type: "on_interaction_over", threshold: 50 },
      },
    },
  }}
/>
```

Use the existing ProvenanceProvider and ProvenanceButton with the matching id.
Standard selection/provenance props are the same as CheckboxGroup. Direct
Checkbox children are converted to the clipped variant; for custom child
wrappers use `src/widgets/ClippedCheckbox.js` inside them.

The new group defaults to clipping without a scalability prop. This is an
explicit opt-in through the new component, not a new default for the old group.
Existing index exports, package build entries and original playground are untouched, so
the new component is not included in the published package or the existing demo.
The root package adds scripts for running and building the copied clipping demo.
Pure helpers are imported directly because editing the existing scalability
index.js would violate the additive-only constraint.

## First-version semantics

- Interaction mode only. `on_time_over` is explicitly unsupported; time mode
  retains the original un-clipped domain. No overlap/spacing detector is added.
- Default trigger threshold: 50 group selection changes. The compressed region
  is `[0, cutoff]` where `cutoff = floor((N-1) / threshold) * threshold`, so the
  retained (recent) span tracks the threshold. Clipping starts strictly above
  the threshold, and never removes anything when there are at most 50 changes.
- Counts use the core selection index, not the sum of per-option intervals.
  Repeated identical states do not increment that index.
- The single temporal axis always spans `n=0` to `now`. Once clipping is active,
  `[0, cutoff]` is compressed into the leftmost 10% of the axis and
  `[cutoff, now]` fills the remaining 90%. The default left handle sits at the
  compression boundary (axis 10% = interaction `cutoff`); dragging it back into
  the 0–10% band reveals the older `0..cutoff` data.
  At N=100 (threshold 50): `[0, 50]` → 10%, `[50, 100]` → 90%.
  At N=101: `[0, 100]` → 10%, `[100, 101]` → 90%.
- The dark `n=0` origin label is retained once. Light threshold ticks start at
  `n=50`, so they do not duplicate the origin. The origin label shrinks by
  0.5px per completed clipping block, down to a readable 10px minimum.
- New interactions move the base window; the relative handle positions remain.
- Intervals crossing the left edge and still-selected intervals are retained.
  Original record coordinates and tooltip timestamps are preserved. Pointer and
  keyboard restore resolve a point inside the visible interval, then use the
  group's existing full-selection restore path.
- This limits visible geometry only. History is not deleted, aggregate values
  are not recomputed, and it does not bound memory or full-history scan cost.
- width/k adaptive defaults and physical/pixel spacing detection are deferred.

## Verification

```sh
npm run typecheck
npm run playground:clipping:build
```

The copied playground imports the source-only extension directly; the unchanged
library entry does not import it.
