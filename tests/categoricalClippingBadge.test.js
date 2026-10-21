import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveActiveClippingBadge } from '../src/shared/logic/scalability/views/clippingNotice.js';
import { getClippingBadgeColor } from '../src/shared/logic/clippingBadgeColor.js';

const records = Array.from({ length: 16 }, (_, i) => ({
    kind: 'interaction', timestamp: new Date(i * 1000).toISOString(), value: ['A'],
}));
const clipping = { strategy: 'clipping', clipping_options: {
    trigger: { type: 'interaction', threshold: 10 },
} };
const resolve = (scalability, showTimeline, data = records) => resolveActiveClippingBadge({
    scalability, showTimeline, records: data, mode: 'interaction', width: 300,
}).message;

test('aggregate clipping remains visible with temporal zoom and follows the active view', () => {
    const scalability = { temporal_view: { strategy: 'zoom_in' }, aggregate_view: clipping };
    assert.equal(resolve(scalability, false), '6 interactions hidden');
    assert.equal(resolve(scalability, true), null);
    assert.equal(resolve(scalability, false, records.slice(0, 10)), null);
    assert.equal(resolve(scalability, false, records.slice(0, 11)), '1 interaction hidden');
    assert.equal(resolve(scalability, false, []), null);
});
test('temporal-only clipping does not affect the aggregate view', () => {
    assert.equal(resolve({ temporal_view: clipping, aggregate_view: { strategy: 'zoom_in' } }, false), null);
    assert.equal(resolve({ temporal_view: clipping, aggregate_view: { strategy: 'zoom_in' } }, true), '6 interactions hidden');
    assert.equal(resolve({ temporal_view: clipping }, false), null);
    assert.equal(resolve({ temporal_view: clipping }, true), '6 interactions hidden');
    assert.equal(resolve({}, false), null);
});
test('time clipping reports hidden interactions, not elapsed seconds', () => {
    assert.equal(resolve({ aggregate_view: { strategy: 'clipping', clipping_options: {
        trigger: { type: 'time', threshold: 10 },
    } } }, false), '6 interactions hidden');
});
test('badge color stays yellow across all widget colors', () => {
    assert.equal(getClippingBadgeColor('#ffffff'), '#FFD600');
    assert.equal(getClippingBadgeColor('#2c3e50'), '#FFD600');
    assert.equal(getClippingBadgeColor(null), '#FFD600');
});
