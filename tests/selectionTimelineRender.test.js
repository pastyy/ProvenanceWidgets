import { interpolateOranges, lab } from 'd3';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildSelectionTimelineBars } from '../src/shared/logic/selectionTimeline.js';
import { findClippedSelectionBar } from '../src/shared/logic/scalability/strategies/clipping/selectionTimeline.js';

const result = await build({
    entryPoints: [fileURLToPath(new URL('../src/widgets/TimelineVis.js', import.meta.url))],
    bundle: true, write: false, format: 'esm', platform: 'node',
    loader: { '.js': 'jsx' }, jsx: 'automatic',
    plugins: [{ name: 'shared-react', setup(builder) {
        builder.onResolve({ filter: /^react(?:\/.*)?$/ }, args => ({
            path: import.meta.resolve(args.path), external: true,
        }));
    } }],
});
const TimelineVis = (await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`)).default;
const records = [
    { select: { index: 1 }, unselect: { index: 3 } },
    { select: { index: 5 }, unselect: { index: 9 } },
];

test('selection intervals preserve gaps and global recency under zoom', () => {
    const full = buildSelectionTimelineBars({ records, maxIndex: 11 });
    assert.deepEqual(full.map(({ left, width }) => [left, width]), [[0, 20], [40, 40]]);
    const zoomed = buildSelectionTimelineBars({ records, maxIndex: 11, brushRange: [50, 90] });
    assert.equal(zoomed.length, 1);
    assert.equal(zoomed[0].gradientStart, 0.5);
    assert.equal(zoomed[0].gradientEnd, 0.8);
    assert.equal(zoomed[0].width, 75);
});

test('selection blocks preserve original colors and gaps without a row outline', () => {
    const html = renderToStaticMarkup(createElement(TimelineVis, { records, maxIndex: 11 }));
    assert.doesNotMatch(html, /linear-gradient|box-shadow/);
    assert.match(html, /background:#E5E5E5/);
    assert.match(html, /background:#fff/);
    assert.doesNotMatch(html, /min-width:8px/);
    assert.doesNotMatch(html, /data-provenance-current-time/);
    const zoomed = renderToStaticMarkup(createElement(TimelineVis, { records, maxIndex: 11, brushRange: [0, 50] }));
    assert.doesNotMatch(zoomed, /data-provenance-current-time/);
});

test('clipped restore hit testing ignores white gaps', () => {
    const bars = [{ left: 0, width: 1 }];
    const bounds = { left: 0, width: 100 };
    assert.equal(findClippedSelectionBar(bars, 0.5, bounds), bars[0]);
    assert.equal(findClippedSelectionBar(bars, 4, bounds), null);
});

test('selection smoothing blurs only different-color edges and retains straight blocks', () => {
    const html = renderToStaticMarkup(createElement(TimelineVis, {
        records, maxIndex: 11, smoothing: true,
        onRestore: () => {},
    }));
    assert.doesNotMatch(html, /linearGradient|linear-gradient/);
    assert.equal((html.match(/data-provenance-smoothed-boundary=/g) ?? []).length, 3);
    assert.match(html, /x="0%" width="20%" height="24" fill="#E5E5E5"/);
    assert.match(html, /x="40%" width="40%" height="24" fill="rgb\(/);
    assert.equal((html.match(/<feGaussianBlur/g) ?? []).length, 3);
    assert.doesNotMatch(html, /<path/);
    assert.match(html, /fill="#E5E5E5"/);
    assert.match(html, /fill="rgb\(/);
    assert.match(html, /fill="#fff"/);
    assert.doesNotMatch(html, /linear-gradient\(to right/);
    assert.equal((html.match(/role="button"/g) ?? []).length, 2);
});

test('selection non-smoothing preserves solid original colors without blur', () => {
    const html = renderToStaticMarkup(createElement(TimelineVis, {
        records, maxIndex: 11, smoothing: false,
    }));
    assert.match(html, /background:#E5E5E5/);
    assert.doesNotMatch(html, /linearGradient|linear-gradient|feGaussianBlur/);
});

test('empty selection smoothing stays white and finite', () => {
    const html = renderToStaticMarkup(createElement(TimelineVis, {
        records: [], maxIndex: 1, smoothing: true,
    }));
    assert.doesNotMatch(html, /NaN|Infinity|undefined/);
    assert.match(html, /fill="#fff"/);
});

for (const [mechanism, options] of [
    ['zoom in', { brushRange: [20, 80] }],
    ['clipping', { clipping: true }],
    ['smoothing', { smoothing: true }],
]) {
    test(`selection temporal ${mechanism} keeps the track unframed and outlines individual blocks`, () => {
        const html = renderToStaticMarkup(createElement(TimelineVis, {
            records, maxIndex: 11, ...options,
        }));
        assert.doesNotMatch(html, /(?:border-right:|box-shadow:|data-provenance-current-time)/);
        if (!options.smoothing) {
            const blocks = html.match(/<div[^>]*data-provenance-timeline-bar="true"[^>]*>/g) ?? [];
            assert.ok(blocks.length > 0);
            for (const block of blocks) assert.match(block, /border:1px solid/);
        }
    });
}

test('multiple selection widgets use distinct local filters without row frames', () => {
    const html = renderToStaticMarkup(createElement('div', null,
        ...['checkbox-group', 'radiobutton-group', 'single-select-dropdown', 'multi-select-dropdown'].map(widgetId =>
            createElement(TimelineVis, { key: widgetId, widgetId, records, maxIndex: 11, smoothing: true })
        ),
    ));
    assert.equal((html.match(/data-provenance-smoothed-boundary=/g) ?? []).length, 12);
    const ids = [...html.matchAll(/<filter id="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(ids).size, 12);
    assert.doesNotMatch(html, /linearGradient|linear-gradient|box-shadow|data-provenance-current-time/);
});

test('Checkbox whole-bar smoothing preserves recency and accepts an uncapped blur radius', () => {
    const render = smoothingBlurRadius => renderToStaticMarkup(createElement(TimelineVis, {
        records, maxIndex: 11, smoothing: true, smoothingWholeBar: true,
        smoothingBlurRadius,
    }));
    const html = render(3);
    assert.match(html, /data-provenance-selection-smoothing="whole-bar"/);
    assert.match(html, /stdDeviation="3 0"/);
    assert.doesNotMatch(html, /data-provenance-smoothed-boundary/);
    assert.match(html, /fill="#E5E5E5"/);
    assert.match(render(100), /stdDeviation="100 0"/);
    assert.doesNotMatch(render(0), /<g filter=/);
});

// Regression for the committed selection recency behavior, including the
// unblurred source colors used by whole-track smoothing.
test('reselection grays the previous interval and idle selections fade as interactions accumulate', () => {
    const colors = (records, maxIndex) => {
        const html = renderToStaticMarkup(createElement(TimelineVis, {
            records, maxIndex, smoothing: true, smoothingWholeBar: true,
        }));
        return [...html.matchAll(/height="24" fill="([^"]+)" stroke=/g)].map(match => match[1]);
    };
    const previous = { select: { index: 5 }, unselect: { index: 7 } };
    const current = { select: { index: 9 } };
    const initial = colors([previous], 8);
    assert.notEqual(initial[0], '#E5E5E5');
    const reselected = colors([previous, current], 10);
    assert.equal(reselected[0], '#E5E5E5');
    assert.notEqual(reselected[1], '#E5E5E5');
    const aged = colors([previous, current], 30);
    assert.equal(aged[0], '#E5E5E5');
    // Original formula: interpolateOranges(0.3 + (select.index - 1) / (maxIndex - 1) * 0.7).
    assert.equal(reselected[1], interpolateOranges(0.3 + 8 / 9 * 0.7));
    assert.equal(aged[1], interpolateOranges(0.3 + 8 / 29 * 0.7));
    assert.ok(lab(aged[1]).l > lab(reselected[1]).l);
});
