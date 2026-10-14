import { useState } from "react";
import { parseSmoothingParameter, sliderSmoothingParameters } from "./sliderSmoothingParameters.js";

export default function SliderSmoothingControls({ method, onMethodChange, onParameterChange }) {
  // Keep each method's unfinished edits independently when switching algorithms.
  const [drafts, setDrafts] = useState({});

  return (
    <fieldset className="slider-smoothing-controls">
      <legend>Slider aggregate smoothing</legend>
      <label className="slider-smoothing-controls__field">
        <span>method</span>
        <select value={method.type} onChange={event => onMethodChange(event.target.value)}>
          <option value="savgol">Savitzky–Golay</option>
          <option value="gaussian">Gaussian</option>
          <option value="bspline">B-spline</option>
        </select>
      </label>
      {sliderSmoothingParameters[method.type].map(parameter => {
        const key = `${method.type}-${parameter.name}`;
        const value = drafts[key] ?? method[parameter.name];
        const invalid = parseSmoothingParameter(parameter, value) === null;
        return (
          <label key={key} className="slider-smoothing-controls__field">
            <span>{parameter.name}</span>
            <input type="number" value={value} min={parameter.min} max={parameter.max}
              step={parameter.step} aria-invalid={invalid} aria-describedby={`${key}-hint`}
              onChange={event => {
                const rawValue = event.target.value;
                setDrafts(previous => ({ ...previous, [key]: rawValue }));
                const parsed = parseSmoothingParameter(parameter, rawValue);
                if (parsed !== null) onParameterChange(method.type, parameter.name, parsed);
              }} />
            <small id={`${key}-hint`}>
              {invalid ? `Invalid value — ${parameter.hint}` : parameter.hint}
            </small>
          </label>
        );
      })}
      <div className="slider-smoothing-controls__note">
        Valid changes update both sliders immediately. Empty or invalid values keep the last valid curve.
      </div>
    </fieldset>
  );
}
