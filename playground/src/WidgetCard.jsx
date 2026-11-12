import { ProvenanceButton } from "../../src/index.ts";

import { AGGREGATE_B64, TEMPORAL_B64 } from "../../src/shared/logic/footprintIcons.js";
import { keepOpenProvenanceView } from "./provenanceViewInteraction.js";

export default function WidgetCard({ id, title, children, strategies, defaultStrategies, onStrategyChange, supportsSmoothing }) {
  return (
    <section
      className="widget-card"
      aria-labelledby={`${id}-title`}
      onMouseDown={keepOpenProvenanceView}
    >
      <div className="widget-card__heading">
        <ProvenanceButton target={id} />
        <h2 id={`${id}-title`}>{title}</h2>
      {onStrategyChange && (
        <div className="widget-card__strategies">
          {[
            ["aggregate_view", "Summary", AGGREGATE_B64, "Aggregate: how often each value was selected. Matches the hollow footprint."],
            ["temporal_view", "History", TEMPORAL_B64, "Temporal: selections in time order. Matches the filled footprint."],
          ].map(([view, label, icon, description]) => (
            <label key={view} htmlFor={`${id}-${view}-strategy`} title={description}>
              <img src={icon} width="16" height="22" alt="" aria-hidden="true" />
              <span className="widget-card__strategy-field">
              <span>{label}</span>
              <select id={`${id}-${view}-strategy`}
                aria-label={`${label} strategy. ${description}`}
                value={strategies?.[view] ?? defaultStrategies[view]}
                onChange={event => onStrategyChange(view, event.target.value)}>
                <option value="zoom_in">{view === "aggregate_view" ? "None" : "Zoom in"}</option>
                <option value="clipping">Clipping</option>
                {(supportsSmoothing === true || (Array.isArray(supportsSmoothing) && supportsSmoothing.includes(view))) && <option value="smoothing">Smoothing</option>}
              </select>
              </span>
            </label>
          ))}
        </div>
      )}
      </div>
      <div className="widget-card__content">{children}</div>
    </section>
  );
}
