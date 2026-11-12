import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveClippingConfig } from '../src/shared/logic/scalability/strategies/clipping/config.js';
import { resolveSelectionTemporalView } from '../src/shared/logic/scalability/strategies/clipping/selectionTemporal.js';

const clipping = threshold => ({ strategy: 'clipping', clipping_options: {
    trigger: { type: 'interaction', threshold },
} });

test('each view resolves only its own clipping strategy and threshold', () => {
    const scalability = { temporal_view: clipping(5), aggregate_view: clipping(12) };
    assert.equal(resolveClippingConfig(scalability).threshold, 5);
    assert.equal(resolveClippingConfig(scalability, { view: 'aggregate_view' }).threshold, 12);
    assert.equal(resolveClippingConfig({ temporal_view: clipping(5) }, { view: 'aggregate_view' }).enabled, false);
    assert.equal(resolveClippingConfig({ aggregate_view: clipping(12) }).enabled, false);
});

test('obsolete timeline option cannot enable the legacy axis during clipping', () => {
    const temporal_view = clipping(5);
    temporal_view.clipping_options.show_timeline = true;
    assert.equal(resolveSelectionTemporalView({ scalability: { temporal_view } }).showTemporalAxis, false);
    assert.equal(resolveSelectionTemporalView({ scalability: { temporal_view: { strategy: 'zoom_in' } } }).showTemporalAxis, true);
});

test('categorical smoothing leaves full source history intact and disables clipping and zoom axes', () => {
    const provenance = { detailedData: new Map(), aggregateData: new Map() };
    const result = resolveSelectionTemporalView({
        provenance,
        scalability: {
            temporal_view: { strategy: 'smoothing', clipping_options: { trigger: { threshold: 1 } } },
            aggregate_view: { strategy: 'zoom_in' },
        },
    });
    assert.equal(result.clippingEnabled, false);
    assert.equal(result.showTemporalAxis, false);
    assert.equal(result.temporalProvenance, provenance);
    assert.equal(result.aggregateProvenance, provenance);
});
