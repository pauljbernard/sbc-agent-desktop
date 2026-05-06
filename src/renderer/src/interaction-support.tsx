import type { LinkedEntityRefDto, MessageDto } from "../../shared/contracts";
import { Badge } from "./surface-support";

export type SignalPriority = "red" | "yellow" | "blue";
export interface SignalCounts {
  red: number;
  yellow: number;
  blue: number;
}

export type AttentionTone = "active" | "warning" | "danger" | "steady";

export function signalPriorityForTone(tone: AttentionTone): SignalPriority | null {
  switch (tone) {
    case "danger":
      return "red";
    case "warning":
      return "yellow";
    case "active":
      return "blue";
    default:
      return null;
  }
}

export function MessageBubble({
  message,
  isSelected,
  onSelect
}: {
  message: MessageDto;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      aria-pressed={isSelected}
      className={`message-bubble role-${message.role}${isSelected ? " selected" : ""}`}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <p>{message.content}</p>
    </div>
  );
}

export function RefBlock({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="ref-block">
      <p className="context-label">{label}</p>
      {values.length > 0 ? (
        <div className="ref-list">
          {values.map((value) => (
            <span className="thread-flag" key={value}>
              {value}
            </span>
          ))}
        </div>
      ) : (
        <p className="list-empty">None</p>
      )}
    </div>
  );
}

export function LinkedEntityList({
  entities,
  navigateToLinkedEntity
}: {
  entities: LinkedEntityRefDto[];
  navigateToLinkedEntity?: (entity: LinkedEntityRefDto) => Promise<void>;
}) {
  return (
    <div className="entity-list">
      {entities.map((entity) => {
        const interactive = Boolean(navigateToLinkedEntity);
        const content = (
          <>
            <div>
              <strong>{entity.label}</strong>
              <p>{entity.entityId}</p>
            </div>
            <div className="entity-meta">
              <Badge tone="steady">{entity.entityType}</Badge>
              {interactive ? <span className="entity-jump-hint">Open</span> : null}
            </div>
          </>
        );

        return interactive ? (
          <button
            className="entity-row entity-row-button"
            key={`${entity.entityType}-${entity.entityId}`}
            onClick={() => void navigateToLinkedEntity?.(entity)}
            type="button"
          >
            {content}
          </button>
        ) : (
          <div className="entity-row" key={`${entity.entityType}-${entity.entityId}`}>
            {content}
          </div>
        );
      })}
    </div>
  );
}

function PriorityBubble({ count, priority }: { count: number; priority: SignalPriority }) {
  return <span className={`priority-bubble priority-${priority}`}>{count}</span>;
}

export function PrioritySignalCluster({ counts }: { counts: SignalCounts }) {
  if (counts.red + counts.yellow + counts.blue <= 0) {
    return <span className="workspace-signal workspace-signal-muted">Quiet</span>;
  }

  return (
    <div className="priority-signal-cluster" aria-label="Priority signals">
      {counts.red > 0 ? <PriorityBubble count={counts.red} priority="red" /> : null}
      {counts.yellow > 0 ? <PriorityBubble count={counts.yellow} priority="yellow" /> : null}
      {counts.blue > 0 ? <PriorityBubble count={counts.blue} priority="blue" /> : null}
    </div>
  );
}

export function PriorityStateChip({
  label,
  tone
}: {
  label: string;
  tone: AttentionTone;
}) {
  const priority = signalPriorityForTone(tone) ?? "blue";
  return (
    <span className={`priority-state-chip priority-${priority}`}>
      <span aria-hidden="true" className="priority-state-dot" />
      <span>{label}</span>
    </span>
  );
}
