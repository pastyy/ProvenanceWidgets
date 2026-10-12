# ProvenanceWidgets

A JavaScript library of GUI Controls for Tracking and Dynamically Overlaying Analytic Provenance.

## Read and cite our papers

#### SuperProvenanceWidgets, published at the 2026 ACM CHI Conference
[![DOI:10.1145/3772363.3798409](https://zenodo.org/badge/DOI/10.1145/3772363.3798409.svg)](https://doi.org/10.1145/3772363.3798409)
[![arXiv badge](https://img.shields.io/badge/arXiv-2604.15342-red)](https://arxiv.org/abs/2604.15342)

```bibTeX
@inproceedings{verma2026superprovenancewidgets,
  title = {{SuperProvenanceWidgets}: {Tracking and Visualizing Analytic Provenance Across UI Control Elements}},
  author = {{Verma}, Antariksh and {Odak}, Kaustubh and {Narechania}, Arpit},
  booktitle = {Extended Abstracts of the 2026 CHI Conference on Human Factors in Computing Systems},
  doi = {10.1145/3772363.3798409},
  url = {https://doi.org/10.1145/3772363.3798409},
  year = {2026},
  publisher = {Association for Computing Machinery}
}
```

#### ProvenanceWidgets, published at the 2024 IEEE VIS Conference
[![DOI:10.1109/TVCG.2024.3456144](https://zenodo.org/badge/DOI/10.1109/TVCG.2024.3456144.svg)](https://doi.org/10.1109/TVCG.2024.3456144)
[![arXiv badge](https://img.shields.io/badge/arXiv-2407.17431-red)](https://arxiv.org/abs/2407.17431)
[![NPM - Downloads](https://img.shields.io/npm/dm/provenance-widgets)](https://www.npmjs.com/package/provenance-widgets)

```bibTeX
@article{narechania2024provenancewidgets,
  title = {{ProvenanceWidgets}: {A Library of UI Control Elements to Track and Dynamically Overlay Analytic Provenance}},
  shorttitle = {{ProvenanceWidgets}},
  author = {{Narechania}, Arpit and {Odak}, Kaustubh and {El-Assady}, Mennatallah and {Endert}, Alex},
  journal = {IEEE Transactions on Visualization and Computer Graphics (TVCG)},
  doi = {10.1109/TVCG.2024.3456144},
  url = {https://doi.org/10.1109/TVCG.2024.3456144},
  year = {2024},
  publisher = {IEEE}
}
```

<div align="center">
  <a href="http://www.replicabilitystamp.org#https-github-com-provenancewidgets-provenancewidgets-github-io">
   <img src="https://www.replicabilitystamp.org/logo/Reproducibility-small.png">
  </a>
</div>
<p align="center">
  GRSI-approved replicable project
</p>

## Documentation

Visit https://provenancewidgets.github.io/ to view the full documentation and demos.

## Install

```bash
npm install provenance-widgets
```

## Development

```bash
npm install
```

Run the local component playground, which imports directly from `src/index.ts`:

```bash
npm run playground
```

Use `npm run playground:build` to verify its production bundle.

## Deployment

```bash
npm run verify
npm login --auth-type=web
npm whoami
npm pack --dry-run
npm publish --access public
```

## Selection clipping

CheckboxGroup, RadioGroup, SingleSelectDropdown, and MultiSelectDropdown share
clipping for both `temporal_view` and `aggregate_view`. Each view uses
`strategy: "clipping"` and `clipping_options.trigger`, supporting
`on_interaction_over` (default) and `on_time_over` (recorded elapsed seconds).
The default threshold is `max(1, floor(widgetWidth / 10))`.
At each threshold boundary, the view clears its displayed history and starts a
new period; original provenance and current values are preserved. Temporal
axis labels keep the cumulative offset, e.g. `n=20` through `now (21)`.
See [clipping configuration and semantics](src/shared/logic/scalability/CLIPPING.md).

## Checkbox scalability

Checkbox zoom calculation, state, and UI live together in `src/widgets/CheckboxGroup.js`,
following the slider renderer in `src/widgets/Chart.js`. Both import configuration
and trigger helpers through `src/shared/logic/scalability/index.js`.

`CheckboxGroup` uses the active `DEFAULT_CHECKBOX_SCALABILITY` configuration in
`src/types/scalability.ts`, with the same field names as sliders. Edit parameters
there for the existing zoom path. Explicit `clipping` configurations supplied
through `scalability` use the shared selection implementation instead.
The configuration is shared, while each group maintains independent brush and
suggestion state. The playground is not required by the library.

For example, `threshold: 20` uses blocks of 20 for checkbox zoom.
`auto_zoom: false` keeps the full history visible until the user
brushes or accepts a suggestion.

In interaction mode, checkbox zoom keeps older history in a compressed region
of the brush axis. With threshold 20, automatic zoom compresses completed
blocks of 20 and focuses on the current block. Both handles can still
move continuously back through older history. Changing `threshold` changes
the block size. This preserves the existing checkbox history zoom behavior.

`visibility` controls brush visibility before the threshold (`all-active`, `after-trigger`, or `off`).
`auto_zoom` controls automatic focus and axis compression. When false,
reaching the threshold leaves both the full history and the uncompressed axis
unchanged. Manual brushing selects a range on that axis; accepting a suggestion
activates the compressed axis and focuses the current block. Set `suggestion`
to true to offer that suggestion. `time` measures the recorded history
span in seconds and zooms to recent history without interaction-block compression.
Suggestions appear even while the checkbox history view is closed; accepting
one opens that view and applies the zoom. Dismissing a suggestion leaves the
current view unchanged.
`temporalBrush={false}` disables the zoom tool and automatic zoom.

Checkbox currently supports `modes: ["interactions"]` (history-range zoom).
Numeric `values` and `rectangle-2d` dimensions do not apply to its categorical
options and are ignored. Checkbox zoom does not implement `smoothening` or
aggregate zoom. Aggregate clipping is supported through `scalability` as described
above. Configure checkbox zoom using `zoom_in_options` in the central object.

## Contact

If you have any questions, feel free to [open an issue](https://github.com/ProvenanceWidgets/ProvenanceWidgets/issues/new/choose) or contact [Arpit Narechania](https://narechania.com).
