import type { ReactNode } from "react";
import type { CommandResultDto, RuntimeEvalResultDto } from "../../shared/contracts";

export function transcriptRecencyLabel(timestamp: string): string {
  const value = Date.parse(timestamp);
  if (Number.isNaN(value)) {
    return "Retained";
  }

  const deltaMs = Date.now() - value;
  const deltaMinutes = Math.max(0, Math.floor(deltaMs / 60000));
  if (deltaMinutes < 5) {
    return "Active Now";
  }
  if (deltaMinutes < 60) {
    return `${deltaMinutes}m ago`;
  }

  const deltaHours = Math.floor(deltaMinutes / 60);
  if (deltaHours < 24) {
    return `${deltaHours}h ago`;
  }

  const deltaDays = Math.floor(deltaHours / 24);
  if (deltaDays < 7) {
    return `${deltaDays}d ago`;
  }

  return "Earlier";
}

export function toneForCommandStatus(
  status: CommandResultDto<RuntimeEvalResultDto>["status"]
): "active" | "warning" | "danger" | "steady" {
  switch (status) {
    case "ok":
      return "active";
    case "awaiting_approval":
      return "warning";
    case "error":
    case "rejected":
      return "danger";
    default:
      return "steady";
  }
}

export function HelpHint({ text }: { text: string }) {
  return (
    <span className="help-hint" aria-label={text} title={text}>
      ?
    </span>
  );
}

export function PanelHeader({
  title,
  subtitle,
  helpText
}: {
  title: string;
  subtitle: string;
  helpText?: string;
}) {
  const hasSubtitle = subtitle.trim().length > 0;
  return (
    <div className={`panel-header${hasSubtitle ? "" : " panel-header-compact"}`}>
      <div>
        <div className="panel-header-title-row">
          <p className="eyebrow">{title}</p>
          {helpText ? <HelpHint text={helpText} /> : null}
        </div>
        {hasSubtitle ? <p className="panel-subtitle">{subtitle}</p> : null}
      </div>
    </div>
  );
}

export function Badge({
  children,
  tone
}: {
  children: ReactNode;
  tone: "active" | "warning" | "danger" | "steady";
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
