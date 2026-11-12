import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildSelectionSmoothingBoundaries } from '../src/shared/logic/selectionSmoothingBoundaries.js';
const bar = (left, width, color = '#E5E5E5') => ({ left: `${left}%`, width: `${width}%`, color });

test('gray-white-gray has exactly two independent boundary patches', () => {
    const bars = [bar(0, 40), bar(60, 40)];
    const copy = structuredClone(bars);
    const edges = buildSelectionSmoothingBoundaries(bars);
    assert.deepEqual(edges.map(edge => edge.position), [40, 60]);
    assert.deepEqual(edges.map(edge => [edge.leftColor, edge.rightColor]), [
        ['#E5E5E5', '#fff'], ['#fff', '#E5E5E5'],
    ]);
    assert.ok(edges[0].left + edges[0].width < 50);
    assert.ok(edges[1].left > 50);
    assert.deepEqual(bars, copy);
});

test('narrow gaps retain at least their middle half even with a large requested radius', () => {
    const edges = buildSelectionSmoothingBoundaries([bar(0, 49.9), bar(50.1, 49.9)], 20);
    assert.equal(edges.length, 2);
    const untouched = edges[1].left - (edges[0].left + edges[0].width);
    assert.ok(untouched >= 0.099999);
});

test('touching interactions share one edge; track endpoints never get patches', () => {
    const edges = buildSelectionSmoothingBoundaries([bar(0, 50), bar(50, 50, '#f57623')]);
    assert.equal(edges.length, 1);
    assert.equal(edges[0].position, 50);
    assert.equal(edges[0].rightColor, '#f57623');
    assert.deepEqual(buildSelectionSmoothingBoundaries([bar(0, 100)]), []);
});

test('empty, zero-duration and invalid intervals create no fake boundaries', () => {
    assert.deepEqual(buildSelectionSmoothingBoundaries([]), []);
    assert.deepEqual(buildSelectionSmoothingBoundaries([bar(50, 0), bar(NaN, 10)]), []);
    assert.deepEqual(buildSelectionSmoothingBoundaries([bar(0, 40), bar(60, 40)], 0), []);
});

test('same-color adjacent interactions are not blurred, including equivalent CSS colors', () => {
    assert.deepEqual(buildSelectionSmoothingBoundaries([bar(0, 50), bar(50, 50, 'rgb(229, 229, 229)')]), []);
});
