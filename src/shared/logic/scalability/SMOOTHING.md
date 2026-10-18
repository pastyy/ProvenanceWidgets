# Slider Smoothing

SingleSlider and RangeSlider support Savitzky-Golay, Gaussian, and B-spline
smoothing independently in their temporal and aggregate views. Smoothing is
display-only: it never changes provenance, recorded values, or aggregate data.
The view that reaches its configured trigger replaces its normal marks with a
non-interactive curve; configuring one view does not activate the other.

```jsx
scalability={{
  temporal_view: {
    strategy: "smoothing",
    smoothing_options: {
      method: {
        type: "savgol",
        window_length: 4,
        polyorder: 2,
      },
      trigger: { type: "interaction", threshold: 50 },
    },
  },
}}
```

Use the same structure under `aggregate_view` to smooth aggregate data.

## Temporal View Semantics

- SingleSlider smooths its recorded numeric value over history.
- RangeSlider smooths center and span as separate signals, then reconstructs
  low/high endpoints. Span is clamped to the Slider domain and reconstruction
  guarantees `min <= low <= high <= max`.
- In interaction mode, smoothing distances use record-order units. In time
  mode, they use elapsed seconds from the first valid timestamp. A time series
  with missing or decreasing timestamps remains unsmoothed.
- Non-uniform time histories are linearly adapted to a uniform numerical grid.
  Histories larger than 2,049 points are reduced to a 2,049-point display grid;
  this sampling is independent of rendered pixel size.
- Before the trigger, the existing points, straight connections, tooltips,
  keyboard behavior, and history restore remain unchanged. After the trigger,
  a non-interactive curve replaces the points, connections, and hitboxes. A
  vertical gradient retains their interaction-recency colors.

## Aggregate View Semantics

- SingleSlider smooths interaction frequency across slider values. Values with
  no interactions contribute zero, so gaps remain part of the fitted signal.
- RangeSlider smooths interval coverage: the signal at a value is the number
  of recorded ranges that cover it. It does not smooth low/high endpoint
  histograms separately.
- Sampling follows `min`, `max`, and `step` and is independent of rendered
  pixel width. Numerical work is capped at 2,049 samples. When a larger domain
  must be reduced, SingleSlider averages value-frequency bins and RangeSlider
  averages coverage over each reduced bin.
- Before the trigger, aggregate bars, tooltips, and restore interactions remain
  unchanged. After the trigger, a non-interactive curve replaces the bars and
  hitboxes. Its horizontal gradient retains the bars' recency colors.

## Savitzky-Golay Rules

`window_length` is a positive width in the slider's data-domain units, not a
pixel width. It is converted to the nearest usable odd number of samples and
expanded when necessary so it is greater than `polyorder`. The defaults are
`window_length: 4` and `polyorder: 2`.

Each point is evaluated from a local least-squares polynomial. At the domain
boundaries, the full window shifts inward and evaluates the polynomial at the
boundary point instead of padding or dropping samples. Histories too short for
the configured polynomial remain unsmoothed. Aggregate negative estimates are
clamped to zero. Temporal estimates are clamped to the Slider domain, and
RangeSlider spans are additionally clamped to a valid range.

Aggregate curves use the same x and count scales as the bars. SingleSlider
places gradient color stops at recorded values; RangeSlider places them at
aggregate segment centers. Temporal curves use the existing value and temporal
scales with vertical color stops. All smoothing paths and gradients ignore
pointer events.

## Gaussian Rules

Use `method: { type: "gaussian", sigma: 2, truncate: 3 }`. `sigma` is the
standard deviation in slider data-domain units; `truncate * sigma` is the
support radius. Samples farther away than that radius do not participate.
Weights are `exp(-0.5 * (distance / sigma)^2)` and normalized to sum to one.
At boundaries, only available samples participate and weights are renormalized,
so a constant signal stays constant at both ends. A support radius smaller than
one grid interval leaves the original sample counts unchanged.

## B-spline Rules

Use `method: { type: "bspline", degree: 3, smoothing_factor: 0.5,
knot_spacing: 10 }`. The solver fits a clamped B-spline basis over the whole
data domain, with `degree` between 1 and 5. Repeated endpoint knots bound the
curve to the domain; they do not force interpolation of endpoint counts.

Interior knots start at `min + knot_spacing` and repeat at that spacing. To
avoid an underdetermined or numerically rank-deficient fit on dense requested
knots, the interior-knot count is capped at `floor((n - degree - 1) / 2)`, where
`n` is the numerical sample count. When capped, interior knots are uniformly
redistributed. No interior knots means a single polynomial fit of that degree.
If there are fewer than `degree + 1` samples or solving fails, counts stay unchanged.

`smoothing_factor` controls a discrete curvature penalty on spline coefficients
using Greville abscissae (the averaged knot positions):

```text
minimize ||B c - y||² + lambda ||D c||²
lambda = (sample_count / coefficient_count) * (s / (1 - s))²
```

`D` compares adjacent coefficient slopes, scaled by coefficient count so linear
signals have zero penalty even at the boundaries. `s = 0` means unpenalized
least squares in the chosen basis, not necessarily interpolation. Larger `s`
means stronger curvature suppression. `s = 1` uses the best least-squares line;
values within `1e-6` of 1 use that same limit to avoid numerical ill-conditioning.
The mapping is this API's normalized control, not a library-specific residual
bound. Negative estimates are clamped at display adaptation, just as for Savgol.

## Triggers And Current Scope

- `interaction` counts recorded records whose `kind` is `interaction`, including
  repeated values. Baseline and sampled records do not count.
- `time` measures elapsed seconds between the earliest and latest valid recorded
  timestamps and requires at least one interaction record.
- The defaults are 50 interactions or 3,600 recorded seconds. The curve appears
  when the metric is greater than or equal to the threshold.
- All three methods are implemented independently for temporal and aggregate
  Slider views. Unknown methods never fall back silently to Savitzky-Golay.

Focused numerical and SVG-rendering verification covers aggregate pre-trigger
bars, post-trigger bar/hitbox replacement, temporal single/range paths, bounded
sampling, ordered RangeSlider endpoints, and recency gradients for every method:

```bash
node --test tests/sliderAggregateSmoothing.test.js tests/sliderAggregateSmoothingRender.test.js \
  tests/sliderTemporalSmoothing.test.js tests/sliderTemporalSmoothingRender.test.js
```
