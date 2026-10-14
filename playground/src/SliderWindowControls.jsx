import { useState } from "react";

export default function SliderWindowControls({ enabled, options, onEnabledChange, onOptionsChange }) {
  const [drafts, setDrafts] = useState({});
  return (
    <fieldset className="slider-smoothing-controls">
      <legend>Slider aggregate window</legend>
      <label>
        <input type="checkbox" checked={enabled}
          onChange={event => onEnabledChange(event.target.checked)} /> Enable value window
      </label>
      {["window_size", "window_start"].map(name => {
        const raw = drafts[name] ?? options[name];
        const value = Number(raw);
        const invalid = String(raw).trim() === "" || !Number.isInteger(value) ||
          (name === "window_size" && value <= 0);
        return (
          <label key={name} className="slider-smoothing-controls__field">
            <span>{name}</span>
            <input type="number" step="1" min={name === "window_size" ? 1 : undefined}
              value={raw} aria-invalid={invalid} disabled={!enabled}
              onChange={event => {
                const edit = event.target.value;
                setDrafts(previous => ({ ...previous, [name]: edit }));
                const parsed = Number(edit);
                if (edit.trim() !== "" && Number.isInteger(parsed) &&
                    (name !== "window_size" || parsed > 0)) {
                  onOptionsChange({ ...options, [name]: parsed });
                }
              }} />
            <small>{name === "window_size" ? "Visible value span (positive integer)" : "Left-edge value (integer, clamped to the domain)"}</small>
          </label>
        );
      })}
      <div className="slider-smoothing-controls__note">
        Both sliders use these settings. Scroll independently below each slider to browse values.
      </div>
    </fieldset>
  );
}
