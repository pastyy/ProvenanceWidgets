import assert from "node:assert/strict";
import { test } from "node:test";
import {
    resolveSliderAggregateWindowConfig,
    getSliderAggregateWindowLayout,
    sliderWindowStartToScrollLeft,
    sliderWindowScrollLeftToStart,
} from "../src/shared/logic/scalability/index.js";

const resolve = (options, min = 0, max = 100) => resolveSliderAggregateWindowConfig({
    min, max, scalability: { aggregate_view: { window_options: options } },
});
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9,
    `${actual} should equal ${expected}`);

test("omitted, invalid, and full-domain sizes keep the complete domain", () => {
    for (const size of [undefined, null, 0, -1, 0.5, 20.5, NaN, Infinity, "20", 100, 200]) {
        const config = resolve({ window_size: size, window_start: 90 });
        assert.equal(config.size, 100);
        assert.equal(config.start, 0);
        assert.equal(config.enabled, false);
        const layout = getSliderAggregateWindowLayout({ config, width: 400 });
        assert.equal(layout.contentWidth, 400);
        assert.equal(sliderWindowStartToScrollLeft(layout, 90), 0);
        assert.equal(sliderWindowScrollLeftToStart(layout, 600), 0);
    }
    assert.equal(resolve(undefined, 50, 150).start, 50);
    for (const [min, max] of [[1, 1], [10, 0], [NaN, 100], [0, Infinity], [0.5, 100], [0, 100.5]]) {
        const config = resolve({ window_size: 20 }, min, max);
        assert.equal(config.enabled, false);
        assert.ok(Number.isFinite(config.start));
        assert.equal(getSliderAggregateWindowLayout({ config, width: 400 }).contentWidth, 400);
    }
});

test("starts are absolute domain values, with defaults and clamping", () => {
    const cases = [
        [undefined, 50], [NaN, 50], [Infinity, 50], ["70", 50], [70.5, 50],
        [0, 50], [70, 70], [149, 130],
    ];
    for (const [requested, expected] of cases) {
        const config = resolve({ window_size: 20, window_start: requested }, 50, 150);
        assert.equal(config.start, expected);
        assert.equal(config.maxStart, 130);
        assert.equal(config.enabled, true);
    }
});

test("scroll offsets match integer domain spans, including rightmost and negative windows", () => {
    for (const [min, max, size, start, width] of [
        [0, 100, 20, 30, 400],
        [50, 150, 20, 70, 400],
        [-50, 50, 7, -13, 333],
    ]) {
        const layout = getSliderAggregateWindowLayout({
            config: resolve({ window_size: size, window_start: start }, min, max), width,
        });
        near(layout.contentWidth, width * (max - min) / size);
        const offset = sliderWindowStartToScrollLeft(layout, start);
        near(offset, (start - min) * width / size);
        near(sliderWindowScrollLeftToStart(layout, offset), start);
        near(sliderWindowScrollLeftToStart(layout, -10), min);
        near(sliderWindowScrollLeftToStart(layout, layout.maxScrollLeft + 10), max - size);
        near(sliderWindowStartToScrollLeft(layout, max), layout.maxScrollLeft);
    }
});

test("resizing or changing the span can reproject a user start without resetting it", () => {
    const config = resolve({ window_size: 20, window_start: 30 });
    const userStart = 55;
    for (const width of [240, 500]) {
        const layout = getSliderAggregateWindowLayout({ config, width });
        near(sliderWindowScrollLeftToStart(layout, sliderWindowStartToScrollLeft(layout, userStart)), userStart);
    }
    const wider = getSliderAggregateWindowLayout({
        config: resolve({ window_size: 60, window_start: 30 }), width: 400,
    });
    near(sliderWindowScrollLeftToStart(wider, sliderWindowStartToScrollLeft(wider, userStart)), 40);
    const unmeasured = getSliderAggregateWindowLayout({ config, width: 0 });
    assert.equal(unmeasured.contentWidth, 0);
    assert.equal(sliderWindowStartToScrollLeft(unmeasured, userStart), 0);
    assert.equal(sliderWindowScrollLeftToStart(unmeasured, 0), config.start);
});

test("continuous scrolling and fractional offsets resolve to integer window starts", () => {
    const layout = getSliderAggregateWindowLayout({
        config: resolve({ window_size: 20, window_start: 30 }), width: 400,
    });
    for (const [offset, expected] of [[602, 30], [609, 30], [610, 31], [972.4, 49]]) {
        assert.equal(sliderWindowScrollLeftToStart(layout, offset), expected);
        assert.equal(sliderWindowStartToScrollLeft(layout, expected), expected * 20);
    }
    assert.equal(sliderWindowStartToScrollLeft(layout, 55.25), 1100);
});

test("window normalization is independent of strategy and does not mutate configuration", () => {
    const windowOptions = Object.freeze({ window_size: 20, window_start: 30 });
    for (const strategy of [undefined, "smoothing", "clipping", "zoom_in"]) {
        const aggregate_view = Object.freeze({ strategy, window_options: windowOptions });
        const config = resolveSliderAggregateWindowConfig({
            min: 0, max: 100, scalability: Object.freeze({ aggregate_view }),
        });
        assert.equal(config.start, 30);
        assert.equal(config.size, 20);
        assert.equal(config.enabled, true);
    }
});
