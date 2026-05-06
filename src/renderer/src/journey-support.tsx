import { Badge } from "./surface-support";
export interface JourneyStep {
  id: string;
  title: string;
  summary: string;
  tone: "active" | "warning" | "danger" | "steady";
}

export function JourneyStageStrip({
  eyebrow,
  title,
  summary,
  steps
}: {
  eyebrow: string;
  title: string;
  summary: string;
  steps: JourneyStep[];
}) {
  return (
    <section className="panel journey-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h3>{title}</h3>
        </div>
      </div>
      <p className="panel-subtitle">{summary}</p>
      <div className="journey-step-grid">
        {steps.map((step, index) => (
          <article className={`journey-step journey-step-${step.tone}`} key={step.id}>
            <div className="journey-step-top">
              <span className="journey-step-index">0{index + 1}</span>
              <Badge tone={step.tone}>{step.title}</Badge>
            </div>
            <strong>{step.title}</strong>
            <p>{step.summary}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function DetailRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="detail-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function ContextBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="context-block">
      <p className="context-label">{label}</p>
      <p className="context-value">{value}</p>
    </div>
  );
}
