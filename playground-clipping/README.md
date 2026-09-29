# Checkbox clipping playground

This directory is a copy of `playground/`. It changes the checkbox group to
`ClippedCheckboxGroup` and keeps the other widgets and page styling intact.

From the `ProvenanceWidgets` repository root:

```sh
npm ci
npm run playground:clipping
```

Open `localhost:5174`. If port 5174 is occupied, stop the older playground
process before starting another copy; the server reports the conflict instead
of silently switching ports. `npm ci` is needed only for initial dependency
installation or when dependencies change.

Build check from the repository root: `npm run playground:clipping:build`.
