import { ProvenanceButton } from "../../src/index.ts";

import { keepOpenProvenanceView } from "./provenanceViewInteraction.js";

export default function WidgetCard({ id, title, children }) {
  return (
    <section
      className="widget-card"
      aria-labelledby={`${id}-title`}
      onMouseDown={keepOpenProvenanceView}
    >
      <div className="widget-card__heading">
        <ProvenanceButton target={id} />
        <h2 id={`${id}-title`}>{title}</h2>
      </div>
      <div className="widget-card__content">{children}</div>
    </section>
  );
}
