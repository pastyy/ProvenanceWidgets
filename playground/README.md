# Playground

[Project README](../README.md) · [Scalability API](./SCALABILITY_API.md)

Run from the repository root:

```bash
npm install
npm run playground
```

Open the local URL printed by Vite. `npm run playground:build` writes the production
bundle to `playground/dist/`.

## Files

- [PlaygroundPage.jsx](./src/PlaygroundPage.jsx): widget examples and shared configuration controls.
- [WidgetCard.jsx](./src/WidgetCard.jsx): example card layout.
- [provenanceViewInteraction.js](./src/provenanceViewInteraction.js): demo provenance-view interactions.
- [styles.css](./src/styles.css): playground presentation.
- [vite.config.js](./vite.config.js): source JSX handling and development/build configuration.

The playground imports `src/index.ts` directly. Runtime behavior belongs in the
library; demo settings do not define library defaults.

[scalability_api.json](./scalability_api.json) is a historical design draft containing
comments and pseudo-types, not valid JSON or an executable configuration. Use the
API guides and [public TypeScript contract](../src/types/scalability.ts) for current
usage. Unsupported capabilities are identified explicitly in the API guides.
