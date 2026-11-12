import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const result = await build({
    entryPoints: [fileURLToPath(new URL('../playground/src/WidgetCard.jsx', import.meta.url))],
    bundle: true, write: false, format: 'esm', platform: 'node', jsx: 'automatic',
    plugins: [{ name: 'card-test-dependencies', setup(builder) {
        builder.onResolve({ filter: /^react(?:\/.*)?$/ }, args => ({
            path: import.meta.resolve(args.path), external: true,
        }));
        // The footprint requires a provider; this test exercises the real card's controls.
        builder.onResolve({ filter: /src\/index\.ts$/ }, () => ({ path: 'footprint', namespace: 'stub' }));
        builder.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({
            contents: 'export const ProvenanceButton = () => null;', loader: 'js',
        }));
    } }],
});
const WidgetCard = (await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`)).default;

for (const [label, supportsSmoothing, expected] of [
    ['disabled', false, 0],
    ['omitted', undefined, 0],
    ['both views', true, 2],
    ['temporal only', ['temporal_view'], 1],
]) {
    test(`Playground card renders safely with smoothing ${label}`, () => {
        const html = renderToStaticMarkup(createElement(WidgetCard, {
            id: 'test-card', title: 'Test', supportsSmoothing,
            defaultStrategies: { temporal_view: 'zoom_in', aggregate_view: 'zoom_in' },
            onStrategyChange: () => {},
        }, 'Widget content'));
        assert.match(html, /Widget content/);
        assert.ok(html.indexOf('test-card-aggregate_view-strategy') < html.indexOf('test-card-temporal_view-strategy'));
        assert.match(html, />Zoom in<\/option>/);
        assert.doesNotMatch(html, /Zooming/);
        assert.match(html, /hollow footprint/);
        assert.match(html, /filled footprint/);
        assert.match(html, /<h2[^>]*>Test<\/h2><div class="widget-card__strategies">/);
        const aggregateSelect = html.match(/<select id="test-card-aggregate_view-strategy"[\s\S]*?<\/select>/)[0];
        assert.doesNotMatch(aggregateSelect, />Zoom in</);
        assert.match(aggregateSelect, />None<\/option>/);
        assert.equal((html.match(/<select /g) ?? []).length, 2);
        assert.equal((html.match(/value="smoothing"/g) ?? []).length, expected);
    });
}
