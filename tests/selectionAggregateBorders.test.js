import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const result = await build({
    entryPoints: [fileURLToPath(new URL('../src/shared/components/Bars.js', import.meta.url))],
    bundle: true, write: false, format: 'esm', platform: 'node',
    loader: { '.js': 'jsx' }, jsx: 'automatic',
    plugins: [{ name: 'shared-react', setup(builder) {
        builder.onResolve({ filter: /^react(?:\/.*)?$/ }, args => ({ path: import.meta.resolve(args.path), external: true }));
    } }],
});
const Bars = (await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`)).default;

test('categorical aggregate bars have white outlines while retaining their fills and widths', () => {
    const provenance = {
        aggregateData: new Map([['A', { selections: 10, selectionIndex: 2 }], ['B', { selections: 5, selectionIndex: 1 }]]),
        domain: new Map([['selections', [0, 10]], ['selectionIndex', [0, 2]]]),
    };
    const html = renderToStaticMarkup(createElement(Bars, {
        provenance, barKeys: ['A', 'B'], layout: 'checkbox', width: 200, height: 48,
        orientationScheme: () => '#f57623',
        encodings: { orientation: 'horizontal', positionDomain: 'selections', colorDomain: 'selectionIndex' },
    }));
    assert.equal((html.match(/stroke="#fff" stroke-width="2"/g) ?? []).length, 2);
    assert.equal((html.match(/fill="#f57623"/g) ?? []).length, 2);
    assert.match(html, /width="100" height="24"/);
    assert.match(html, /width="200" height="24"/);
});
