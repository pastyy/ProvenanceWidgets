import { resolveSmoothingConfig } from "../core/normalizeSmoothingConfig.js";
import { hasSmoothingTriggered } from "../triggers/smoothing.js";
import { buildSliderAggregateSamples } from "../adapters/sliderAggregate.js";
import { smoothSavgol } from "../strategies/smoothing/savgol.js";
import { smoothGaussian } from "../strategies/smoothing/gaussian.js";
import { smoothBspline } from "../strategies/smoothing/bspline.js";

const methods = { savgol: smoothSavgol, gaussian: smoothGaussian, bspline: smoothBspline };

export function resolveSliderAggregateSmoothing({ scalability, records = [], ...domain }) {
    const config = resolveSmoothingConfig(scalability);
    if (!config.enabled || !hasSmoothingTriggered(records, config.trigger)) return [];
    const samples = buildSliderAggregateSamples(domain);
    return methods[config.method.type](samples, config.method.options).map(sample => ({
        ...sample, count: Math.max(0, sample.count),
    }));
}
