import { curveMonotoneX, line } from "d3";

/** Display only: the bars retain all hover, keyboard, and restore interactions. */
const SliderSmoothingCurve = ({ samples = [], method = "savgol", min, max, width, height, scaleCount }) => {
    if (samples.length < 2 || max <= min) return null;
    const path = line()
        .x(sample => ((sample.value - min) / (max - min)) * width)
        .y(sample => Math.min(
            height,
            Math.max(0, height - scaleCount(sample.count))
        ))
        .curve(curveMonotoneX)(samples);
    return (
        <path
            data-provenance-smoothing={method}
            d={path}
            fill="none"
            stroke="#2563eb"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
            aria-hidden="true"
        />
    );
};

export default SliderSmoothingCurve;
