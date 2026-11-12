import assert from 'node:assert/strict';
import { test } from 'node:test';
import { configurePlaygroundScalability } from '../playground/src/scalabilityControls.js';
import { resolveClippingConfig } from '../src/shared/logic/scalability/strategies/clipping/config.js';
import { resolveTemporalZoomIn } from '../src/shared/logic/scalability/strategies/zoomin/config.js';
import { resolveSmoothingConfig } from '../src/shared/logic/scalability/strategies/smoothing/config.js';

const options = {
    strategy: 'zoom_in',
    zoom_in_options: { trigger: { threshold: 10, auto_zoom: true } },
    clipping_options: { trigger: { threshold: 5 } },
    smoothing_options: { trigger: { threshold: 1 } },
    window_options: { window_size: 5 },
};
const defaults = { temporal_view: options, aggregate_view: options };
for (const strategy of ['none', 'zoom_in', 'clipping', 'smoothing', 'none']) {
    test(`Playground enables only ${strategy} for temporal view`, () => {
        const config = configurePlaygroundScalability(defaults, { temporal_view: strategy });
        assert.equal(resolveTemporalZoomIn(config).enabled, strategy === 'zoom_in');
        assert.equal(resolveClippingConfig(config, { width: 300 }).enabled, strategy === 'clipping');
        assert.equal(resolveSmoothingConfig(config, 'temporal_view').enabled, strategy === 'smoothing');
        const expectedKeys = strategy === 'none' ? ['strategy'] : ['strategy', `${strategy}_options`];
        assert.deepEqual(Object.keys(config.temporal_view).sort(), expectedKeys.sort());
        assert.equal(config.aggregate_view.strategy, 'zoom_in');
        assert.ok(defaults.temporal_view.window_options);
    });
}
test('aggregate strategy is independent and never inherits temporal options or windows', () => {
    const config = configurePlaygroundScalability(defaults, { aggregate_view: 'clipping', temporal_view: 'smoothing' });
    assert.deepEqual(config.aggregate_view, { strategy: 'clipping', clipping_options: options.clipping_options });
    assert.equal(resolveSmoothingConfig(config).enabled, false);
    assert.equal(resolveClippingConfig(config, { view: 'aggregate_view' }).enabled, true);
});

test('omitted Playground strategies use the per-view defaults', () => {
    for (const source of [{}, { aggregate_view: {}, temporal_view: {} }]) {
        assert.deepEqual(configurePlaygroundScalability(source), {
            aggregate_view: { strategy: 'none' },
            temporal_view: { strategy: 'zoom_in' },
        });
    }
});

test('aggregate none drops inactive options without changing temporal zoom', () => {
    const config = configurePlaygroundScalability(defaults, { aggregate_view: 'none' });
    assert.deepEqual(config.aggregate_view, { strategy: 'none' });
    assert.equal(resolveClippingConfig(config, { view: 'aggregate_view' }).enabled, false);
    assert.equal(resolveSmoothingConfig(config).enabled, false);
    assert.equal(resolveTemporalZoomIn(config).enabled, true);
});
