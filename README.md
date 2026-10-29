# ProvenanceWidgets

A JavaScript library of UI controls for tracking and displaying analytic provenance.
It provides React widgets and Web Components, with temporal and aggregate history views.

## Install

```bash
npm install provenance-widgets
```

## Documentation

- [Upstream documentation and demos](https://provenancewidgets.github.io/)
- Local scalability API: [Scalability API](./playground/SCALABILITY_API.md)
- [Source layout](./src/README.md) and [public types](./src/types/README.md)
- [Web Components](./src/web-components/README.md)
- [Playground](./playground/README.md)

The local API guides describe this checkout's supported features and remaining
work. Detailed behavior is documented once per topic:

| Topic | Scope |
| --- | --- |
| [Clipping](./src/shared/logic/scalability/strategies/clipping/README.md) | Independent temporal and aggregate windows for all seven widgets |
| [Temporal zoom](./src/shared/logic/scalability/strategies/zoomin/README.md) | Slider dimensions and categorical drag-selection brushes |
| [Smoothing](./src/shared/logic/scalability/strategies/smoothing/README.md) | Slider temporal and aggregate curves |
| [Aggregate windows](./src/shared/logic/scalability/windowing/README.md) | Scrollable slider value domains |
| [Development guide](./src/shared/logic/scalability/DEVELOPMENT.md) | Internal structure and extension rules |

## Development

Run commands from the repository root:

```bash
npm install
npm run playground
```

| Command | Purpose |
| --- | --- |
| `node --test tests/*.test.js` | Logic and SVG rendering regressions |
| `npm run typecheck` | TypeScript checking |
| `npm run build` | React library and Web Components bundles |
| `npm run verify` | TypeScript checking followed by both builds |
| `npm run playground:build` | Playground production bundle |

The playground imports source directly and is not a library runtime dependency.
Automated checks do not replace browser interaction and responsive-layout review.

## Publishing

```bash
node --test tests/*.test.js
npm run verify
npm run playground:build
npm pack --dry-run
npm login --auth-type=web
npm whoami
npm publish --access public
```

## Read and cite our papers

### SuperProvenanceWidgets, published at the 2026 ACM CHI Conference
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

### ProvenanceWidgets, published at the 2024 IEEE VIS Conference
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

## Contact

If you have any questions, feel free to [open an issue](https://github.com/ProvenanceWidgets/ProvenanceWidgets/issues/new/choose) or contact [Arpit Narechania](https://narechania.com).
