import { useMemo } from "react";
import type {
  ArtifactDetailDto,
  ArtifactSummaryDto,
  EnvironmentEventDto,
  LinkedEntityRefDto
} from "../../shared/contracts";
import { LinkedEntityList } from "./interaction-support";
import { ContextBlock, JourneyStageStrip } from "./journey-support";
import { Badge, PanelHeader } from "./surface-support";
import { FilterSelect, MetricTile } from "./workspace-support-components";

export function EvidenceWorkspace({
  environmentFocusLabel,
  artifacts,
  selectedArtifact,
  selectedArtifactId,
  setSelectedArtifactId,
  events,
  selectedEventCursor,
  selectedEvent,
  eventFamilyFilter,
  eventVisibilityFilter,
  setSelectedEventCursor,
  setEventFamilyFilter,
  setEventVisibilityFilter,
  navigateToLinkedEntity,
  openConversationDraft,
  openInspectorSurface
}: {
  environmentFocusLabel: string;
  artifacts: ArtifactSummaryDto[];
  selectedArtifact: ArtifactDetailDto | null;
  selectedArtifactId: string | null;
  setSelectedArtifactId: (artifactId: string) => void;
  events: EnvironmentEventDto[];
  selectedEventCursor: number | null;
  selectedEvent: EnvironmentEventDto | null;
  eventFamilyFilter: string;
  eventVisibilityFilter: string;
  setSelectedEventCursor: (cursor: number) => void;
  setEventFamilyFilter: (value: string) => void;
  setEventVisibilityFilter: (value: string) => void;
  navigateToLinkedEntity: (entity: LinkedEntityRefDto) => Promise<void>;
  openConversationDraft: () => Promise<void>;
  openInspectorSurface: () => Promise<void>;
}) {
  const evidenceObjective =
    selectedArtifact?.summary ??
    selectedEvent?.summary ??
    artifacts[0]?.summary ??
    "Inspect durable evidence first, then replay event structure to reconstruct how the environment arrived here.";

  return (
    <div className="evidence-journey">
      <JourneyStageStrip
        eyebrow="Evidence Flow"
        summary="Evidence should let the operator move from durable outputs into replayable observation without leaving the current environment method."
        steps={[
          {
            id: "inspect-artifacts",
            title: "Inspect Artifacts",
            summary: "Read durable outputs first so recovery and execution are anchored in retained proof.",
            tone: artifacts.length > 0 ? "active" : "steady"
          },
          {
            id: "replay-events",
            title: "Replay Events",
            summary: "Use structured history to reconstruct what happened instead of relying on raw logs or transport traces.",
            tone: events.length > 0 ? "active" : "steady"
          },
          {
            id: "reconstruct-truth",
            title: "Reconstruct Truth",
            summary: "Artifacts and events should converge into a usable narrative about the environment’s current posture.",
            tone: selectedArtifact || selectedEvent ? "active" : "steady"
          }
        ]}
        title="Evidence Journey"
      />
      <section className="panel evidence-objective-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Current Evidence Objective</p>
            <h3>{selectedArtifact?.title ?? selectedEvent?.kind ?? artifacts[0]?.title ?? "No evidence selected"}</h3>
          </div>
          <Badge tone={selectedArtifact || selectedEvent ? "active" : "steady"}>
            {selectedArtifact ? "artifact" : selectedEvent ? "event" : "idle"}
          </Badge>
        </div>
        <p className="lead-copy">{evidenceObjective}</p>
        <p className="context-label">{environmentFocusLabel}</p>
        <div className="signal-digest-grid execution-objective-digest">
          <div className="signal-digest-card">
            <span className="context-label">Artifacts</span>
            <strong>{artifacts.length}</strong>
            <p>{artifacts[0]?.title ?? "No durable artifact is foregrounded."}</p>
          </div>
          <div className="signal-digest-card">
            <span className="context-label">Events</span>
            <strong>{events.length}</strong>
            <p>{selectedEvent?.kind ?? "No replayed event is selected."}</p>
          </div>
          <div className="signal-digest-card">
            <span className="context-label">Truth</span>
            <strong>{selectedArtifact || selectedEvent ? "focused" : "idle"}</strong>
            <p>{selectedEvent?.summary ?? selectedArtifact?.summary ?? "Evidence will converge here as artifacts and events are inspected together."}</p>
          </div>
        </div>
        <div className="browser-action-strip">
          <button className="starter-chip" onClick={() => void openConversationDraft()} type="button">
            Continue In Conversation
          </button>
        </div>
      </section>

      <div className="evidence-layout">
        <div className="evidence-main-rail">
          <ArtifactsWorkspace
            artifacts={artifacts}
            navigateToLinkedEntity={navigateToLinkedEntity}
            openInspectorSurface={openInspectorSurface}
            selectedArtifact={selectedArtifact}
            selectedArtifactId={selectedArtifactId}
            setSelectedArtifactId={setSelectedArtifactId}
          />
        </div>
        <div className="evidence-support-rail">
          <ActivityWorkspace
            eventFamilyFilter={eventFamilyFilter}
            eventVisibilityFilter={eventVisibilityFilter}
            events={events}
            openInspectorSurface={openInspectorSurface}
            selectedEvent={selectedEvent}
            selectedEventCursor={selectedEventCursor}
            setEventFamilyFilter={setEventFamilyFilter}
            setEventVisibilityFilter={setEventVisibilityFilter}
            setSelectedEventCursor={setSelectedEventCursor}
          />
        </div>
      </div>
    </div>
  );
}

function ActivityWorkspace({
  events,
  selectedEventCursor,
  selectedEvent,
  eventFamilyFilter,
  eventVisibilityFilter,
  setSelectedEventCursor,
  setEventFamilyFilter,
  setEventVisibilityFilter,
  openInspectorSurface
}: {
  events: EnvironmentEventDto[];
  selectedEventCursor: number | null;
  selectedEvent: EnvironmentEventDto | null;
  eventFamilyFilter: string;
  eventVisibilityFilter: string;
  setSelectedEventCursor: (cursor: number) => void;
  setEventFamilyFilter: (value: string) => void;
  setEventVisibilityFilter: (value: string) => void;
  openInspectorSurface: () => Promise<void>;
}) {
  const families = useMemo(() => {
    const values = new Set(events.map((event) => event.family));
    return ["all", ...Array.from(values)];
  }, [events]);

  const visibilities = useMemo(() => {
    const values = new Set(events.map((event) => event.visibility ?? "unspecified"));
    return ["all", ...Array.from(values)];
  }, [events]);

  return (
    <div className="activity-grid">
      <section className="activity-list-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Event Replay</p>
            <p className="panel-subtitle">The environment emits replayable operational evidence, not disposable console noise.</p>
          </div>
        </div>

        <div className="activity-filter-row">
          <FilterSelect label="Family" options={families} value={eventFamilyFilter} onChange={setEventFamilyFilter} />
          <FilterSelect
            label="Visibility"
            options={visibilities}
            value={eventVisibilityFilter}
            onChange={setEventVisibilityFilter}
          />
        </div>

        <div className="activity-summary-grid">
          <MetricTile label="Visible Events" value={events.length} />
          <MetricTile
            label="Operator Events"
            value={events.filter((event) => (event.visibility ?? "unspecified") === "operator").length}
          />
          <MetricTile label="Families" value={new Set(events.map((event) => event.family)).size} />
        </div>

        <div className="thread-list">
          {events.length > 0 ? (
            events.map((event) => (
              <button
                className={event.cursor === selectedEventCursor ? "event-row active" : "event-row"}
                key={event.cursor}
                onClick={() => setSelectedEventCursor(event.cursor)}
                type="button"
              >
                <div className="event-row-top">
                  <strong>{event.kind}</strong>
                  <Badge tone={toneForEventFamily(event.family)}>{event.family}</Badge>
                </div>
                <p>{event.summary}</p>
                <div className="event-row-meta">
                  <span>{event.timestamp}</span>
                  <span>{event.visibility ?? "unspecified"}</span>
                  <span>#{event.cursor}</span>
                </div>
              </button>
            ))
          ) : (
            <p className="list-empty">No events match the current observation filters.</p>
          )}
        </div>
      </section>

      <section className="activity-detail-panel">
        <div className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Observed Event</p>
              <h3>{selectedEvent ? selectedEvent.kind : "No event matches the active observation filters"}</h3>
            </div>
            <Badge tone={selectedEvent ? toneForEventFamily(selectedEvent.family) : "steady"}>
              {selectedEvent ? selectedEvent.family : "empty"}
            </Badge>
          </div>
          {selectedEvent ? (
            <>
              <p className="lead-copy">{selectedEvent.summary}</p>
              <div className="approval-facts">
                <ContextBlock label="Cursor" value={String(selectedEvent.cursor)} />
                <ContextBlock label="Timestamp" value={selectedEvent.timestamp} />
                <ContextBlock label="Visibility" value={selectedEvent.visibility ?? "unspecified"} />
                <ContextBlock label="Entity" value={selectedEvent.entityId ?? "None"} />
              </div>
              <section className="linked-entities-panel">
                <PanelHeader title="Observed Payload" subtitle="Transport payload remains inspectable and structurally explicit." />
                <pre className="runtime-preview">{JSON.stringify(selectedEvent.payload, null, 2)}</pre>
              </section>
              <div className="browser-action-strip">
                <button className="starter-chip" onClick={() => void openInspectorSurface()} type="button">
                  Open Inspector
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="lead-copy">Observation remains part of the evidence journey even when the current filters yield no event rows.</p>
              <section className="linked-entities-panel">
                <PanelHeader
                  title="Observed Payload"
                  subtitle="When replay results are empty, the desktop should explain why instead of collapsing the detail stage."
                />
                <pre className="runtime-preview">
                  {JSON.stringify({ reason: "no_event_selected", family: eventFamilyFilter, visibility: eventVisibilityFilter }, null, 2)}
                </pre>
              </section>
            </>
          )}
        </div>
      </section>

      <section className="activity-side-panel">
        <div className="panel">
          <PanelHeader title="Why Evidence Flows" subtitle="Attention should emerge from event structure and provenance, not from raw log volume." />
          <div className="entity-list">
            <div className="entity-row">
              <div>
                <strong>Environment-native</strong>
                <p>Events are scoped to the bound environment rather than to a file, tab, or raw transport trace.</p>
              </div>
            </div>
            <div className="entity-row">
              <div>
                <strong>Governed visibility</strong>
                <p>Operator and team visibility remain explicit so attention can be directed without collapsing context.</p>
              </div>
            </div>
            <div className="entity-row">
              <div>
                <strong>Replay before streaming</strong>
                <p>The desktop can bootstrap from durable event history first, then later layer live subscriptions on top.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ArtifactsWorkspace({
  artifacts,
  selectedArtifactId,
  selectedArtifact,
  setSelectedArtifactId,
  navigateToLinkedEntity,
  openInspectorSurface
}: {
  artifacts: ArtifactSummaryDto[];
  selectedArtifactId: string | null;
  selectedArtifact: ArtifactDetailDto | null;
  setSelectedArtifactId: (artifactId: string) => void;
  navigateToLinkedEntity: (entity: LinkedEntityRefDto) => Promise<void>;
  openInspectorSurface: () => Promise<void>;
}) {
  return (
    <div className="artifacts-grid">
      <section className="artifacts-list-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Durable Evidence</p>
            <p className="panel-subtitle">Artifacts remain durable engineering objects with provenance, scope, and downstream consequence.</p>
          </div>
        </div>
        <div className="thread-list">
          {artifacts.length > 0 ? (
            artifacts.map((artifact) => (
              <button
                className={artifact.artifactId === selectedArtifactId ? "thread-row active" : "thread-row"}
                key={artifact.artifactId}
                onClick={() => setSelectedArtifactId(artifact.artifactId)}
                type="button"
              >
                <div className="thread-row-top">
                  <strong>{artifact.title}</strong>
                  <Badge tone="steady">{artifact.kind}</Badge>
                </div>
                <p>{artifact.summary}</p>
                <div className="thread-row-meta">
                  <span>{artifact.artifactId}</span>
                  <span>{artifact.updatedAt}</span>
                </div>
              </button>
            ))
          ) : (
            <p className="list-empty">No artifacts in this environment.</p>
          )}
        </div>
      </section>

      <section className="artifacts-detail-panel">
        {selectedArtifact ? (
          <div className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Selected Evidence</p>
                <h3>{selectedArtifact.title}</h3>
              </div>
              <Badge tone={toneForArtifactState(selectedArtifact.state)}>{selectedArtifact.state}</Badge>
            </div>
            <p className="lead-copy">{selectedArtifact.summary}</p>
            <div className="approval-facts">
              <ContextBlock label="Artifact Id" value={selectedArtifact.artifactId} />
              <ContextBlock label="Kind" value={selectedArtifact.kind} />
              <ContextBlock label="Authority" value={selectedArtifact.authority} />
              <ContextBlock label="Updated" value={selectedArtifact.updatedAt} />
            </div>
            <div className="approval-explanation">
              <p className="lead-copy">{selectedArtifact.provenance}</p>
            </div>
            <section className="linked-entities-panel">
              <PanelHeader
                title="Producing Context"
                subtitle="Artifacts stay attached to the governed work that produced them or still depends on them."
              />
              <LinkedEntityList entities={selectedArtifact.linkedEntities} navigateToLinkedEntity={navigateToLinkedEntity} />
            </section>
            <div className="browser-action-strip">
              <button className="starter-chip" onClick={() => void openInspectorSurface()} type="button">
                Open Inspector
              </button>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <p className="eyebrow">No Artifact Selected</p>
            <h3>Select an artifact to inspect its provenance and scope.</h3>
          </div>
        )}
      </section>

      <section className="artifacts-observations-panel">
        {selectedArtifact ? (
          <div className="panel">
            <PanelHeader title="Observations" subtitle="Why this artifact matters in the current environment posture." />
            <div className="entity-list">
              {selectedArtifact.observations.map((observation) => (
                <div className="entity-row" key={observation}>
                  <div>
                    <strong>{selectedArtifact.kind}</strong>
                    <p>{observation}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <p className="eyebrow">No Observations</p>
            <h3>Select an artifact to inspect its current evidentiary posture.</h3>
          </div>
        )}
      </section>
    </div>
  );
}

function toneForEventFamily(family: string): "active" | "warning" | "danger" | "steady" {
  switch (family) {
    case "runtime":
    case "conversation":
      return "active";
    case "approval":
    case "workflow":
      return "warning";
    case "incident":
      return "danger";
    default:
      return "steady";
  }
}

function toneForArtifactState(state: ArtifactDetailDto["state"]): "active" | "warning" | "danger" | "steady" {
  switch (state) {
    case "active":
      return "active";
    case "draft":
      return "warning";
    case "superseded":
      return "steady";
    case "evidence":
      return "danger";
    default:
      return "steady";
  }
}
