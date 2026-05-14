import { useMemo, useRef, useState } from "react";
import type { DocumentationPageSummaryDto, WorkspaceId } from "../../shared/contracts";
import { BrowserDataTable } from "./browser-data-table";
import { Badge, PanelHeader } from "./surface-support";
import { labelForWorkspace } from "./workspace-shell";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(asRecord).filter((entry): entry is Record<string, unknown> => entry !== null) : [];
}

function stringValue(value: unknown, fallback = "n/a"): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return fallback;
}

function numericValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function PlannedWorkspace({ workspaceId }: { workspaceId: WorkspaceId }) {
  return (
    <div className="empty-state">
      <p className="eyebrow">Planned Workspace</p>
      <h3>{labelForWorkspace(workspaceId)}</h3>
      <p>
        This workspace is intentionally present in navigation now so the shell is built around the full environment
        model, not around one temporary slice.
      </p>
    </div>
  );
}

export function DocumentationWorkspace({
  documentationPages,
  selectedDocumentationSlug,
  setSelectedDocumentationSlug,
  loadDocumentationPage
}: {
  documentationPages: DocumentationPageSummaryDto[];
  selectedDocumentationSlug: string;
  setSelectedDocumentationSlug: (value: string) => void;
  loadDocumentationPage: (slug: string) => Promise<void>;
}) {
  return (
    <div className="documentation-workspace">
      <section className="panel documentation-table-panel">
        <PanelHeader
          title="Documentation Pages"
          subtitle="Browse documentation pages here, then read and inspect the selected page in the inspector."
          helpText="This keeps Documentation scalable in the same way as Configuration: the workspace stays navigational and the inspector becomes the reading surface."
        />
        <BrowserDataTable
          key="desktop-documentation"
          columnTemplate="minmax(0, 1fr) minmax(0, 0.72fr) minmax(0, 1.8fr)"
          columns={[
            {
              id: "title",
              label: "Title",
              render: (row) => <strong>{row.title}</strong>,
              sortValue: (row) => row.title
            },
            {
              id: "category",
              label: "Category",
              render: (row) => <Badge tone="active">{row.category}</Badge>,
              sortValue: (row) => row.category,
              searchValue: (row) => row.category
            },
            {
              id: "summary",
              label: "Summary",
              render: (row) => row.summary,
              sortValue: (row) => row.summary,
              searchValue: (row) => `${row.title} ${row.category} ${row.summary}`
            }
          ]}
          emptyMessage="No documentation pages are available."
          filterLabel="Category"
          filterOptions={Array.from(new Set(documentationPages.map((page) => page.category))).map((value) => ({
            label: value,
            value
          }))}
          getFilterValue={(row) => row.category}
          getRowKey={(row) => row.slug}
          onSelect={(row) => {
            setSelectedDocumentationSlug(row.slug);
            void loadDocumentationPage(row.slug);
          }}
          rows={documentationPages}
          searchPlaceholder="Search documentation"
          selectedKey={selectedDocumentationSlug}
        />
      </section>
    </div>
  );
}

type SupervisionRow = {
  key: string;
  title: string;
  lane: string;
  state: string;
  nextStep: string;
  tone: "active" | "warning" | "danger" | "steady";
  detail: string;
};

export function SupervisionBoard({
  lanes,
  onOpenJourney,
  onPrimaryAction
}: {
  lanes: Array<{
    id: string;
    label: string;
    summary: string;
    tone: "active" | "warning" | "danger" | "steady";
    rows: SupervisionRow[];
  }>;
  onOpenJourney: (key: string) => void;
  onPrimaryAction: (row: SupervisionRow) => Promise<void>;
}) {
  return (
    <section className="panel supervision-board-panel">
      <PanelHeader
        title="Supervision Board"
        subtitle="Long-running work should remain visible as managed continuations with clear next moves."
      />
      <div className="supervision-board">
        {lanes.map((lane) => (
          <section className="supervision-lane" key={lane.id}>
            <div className="supervision-lane-header">
              <div>
                <p className="eyebrow">{lane.label}</p>
                <p className="panel-subtitle">{lane.summary}</p>
              </div>
              <Badge tone={lane.tone}>{String(lane.rows.length)}</Badge>
            </div>
            <div className="supervision-lane-body">
              {lane.rows.length > 0 ? (
                lane.rows.map((row) => (
                  <article className={`supervision-card supervision-card-${row.tone}`} key={row.key}>
                    <div className="supervision-card-top">
                      <strong>{row.title}</strong>
                      <Badge tone={row.tone}>{row.state}</Badge>
                    </div>
                    <p>{row.detail}</p>
                    <div className="supervision-card-actions">
                      <button className="starter-chip" onClick={() => void onPrimaryAction(row)} type="button">
                        {row.nextStep}
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <p className="list-empty">No continuations in this lane.</p>
              )}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

export function BrowserModePicker({
  label,
  options,
  value,
  onChange
}: {
  label: string;
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="browser-mode-picker">
      <span>{label}</span>
      <select
        className="filter-input browser-table-select browser-mode-select"
        aria-label={label}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function MetricTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="metric-tile">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function ActorSystemPanel({
  actorSystemPanel
}: {
  actorSystemPanel: Record<string, unknown> | null;
}) {
  const [selectedTab, setSelectedTab] = useState<
    "overview" | "hierarchy" | "workflow" | "supervision"
  >("overview");
  const panel = asRecord(actorSystemPanel);
  const rootActorId = stringValue(panel?.rootActorId, "actor-system");
  const sessionId = stringValue(panel?.sessionId, "unbound");
  const actors = asRecordArray(panel?.actors);
  const hierarchyEdges = asRecordArray(panel?.hierarchyEdges);
  const workflowEdges = asRecordArray(panel?.workflowEdges);
  const supervisionIncidents = asRecordArray(panel?.supervisionIncidents);
  const runtimeExecution = asRecord(panel?.runtimeExecution);
  const actorById = new Map(
    actors.map((actor) => [stringValue(actor.id ?? actor.actorId, ""), actor])
  );
  const openIncidents = supervisionIncidents.filter((incident) => incident.openP !== false);
  const sortedActors = useMemo(
    () =>
      [...actors].sort((left, right) =>
        stringValue(left.displayName ?? left.label, "").localeCompare(
          stringValue(right.displayName ?? right.label, "")
        )
      ),
    [actors]
  );
  const singletonCount = actors.filter(
    (actor) => stringValue(asRecord(actor.allocationStrategy)?.type, "singleton") === "singleton"
  ).length;
  const poolCount = actors.filter(
    (actor) => stringValue(asRecord(actor.allocationStrategy)?.type, "singleton") === "pool"
  ).length;
  const queuedMailboxCount = actors.reduce(
    (sum, actor) => sum + numericValue(asRecord(actor.metrics)?.queuedMailboxCount),
    0
  );
  const failedMailboxCount = actors.reduce(
    (sum, actor) => sum + numericValue(asRecord(actor.metrics)?.failedMailboxCount),
    0
  );
  const topWorkflowEdges = [...workflowEdges]
    .sort(
      (left, right) =>
        numericValue(right.messageCount ?? right.recentCount) -
        numericValue(left.messageCount ?? left.recentCount)
    )
    .slice(0, 6);
  const poolWorkerCount = numericValue(runtimeExecution?.workerCount);
  const busyWorkerCount = numericValue(runtimeExecution?.busyWorkerCount);
  const idleWorkerCount = numericValue(runtimeExecution?.idleWorkerCount);
  const runtimeQueueDepth = numericValue(runtimeExecution?.queueDepth);

  return (
    <section className="panel actor-system-panel">
      <PanelHeader
        title="Actor System"
        subtitle="Hierarchy, workflow edges, runtime pressure, and supervision are rendered from the live actor packet rather than inferred from transcript behavior."
      />
      <div className="actor-system-topline">
        <div className="signal-digest-grid actor-system-digest">
          <MetricTile label="Root" value={rootActorId} />
          <MetricTile label="Actors" value={actors.length} />
          <MetricTile label="Workflow Edges" value={workflowEdges.length} />
          <MetricTile label="Open Incidents" value={openIncidents.length} />
        </div>
        <div className="ref-list actor-system-flags">
          <span className="thread-flag">{sessionId}</span>
          <span className="thread-flag">{rootActorId}</span>
        </div>
      </div>
      <div className="actor-system-tabs" role="tablist" aria-label="Actor system sections">
        {[
          ["overview", "Overview", actors.length],
          ["hierarchy", "Hierarchy", hierarchyEdges.length],
          ["workflow", "Workflow", workflowEdges.length],
          ["supervision", "Supervision", openIncidents.length]
        ].map(([id, label, count]) => (
          <button
            key={id}
            className={`actor-system-tab${selectedTab === id ? " is-active" : ""}`}
            onClick={() =>
              setSelectedTab(id as "overview" | "hierarchy" | "workflow" | "supervision")
            }
            role="tab"
            type="button"
          >
            <span>{label}</span>
            <Badge tone={selectedTab === id ? "active" : "steady"}>{String(count)}</Badge>
          </button>
        ))}
      </div>
      {selectedTab === "overview" ? (
        <section className="actor-system-detail-panel actor-system-overview">
          <div className="actor-system-overview-grid">
            <section className="actor-system-summary-card">
              <p className="eyebrow">Posture</p>
              <h4>Allocation Mix</h4>
              <div className="actor-system-summary-metrics">
                <div>
                  <strong>{singletonCount}</strong>
                  <span>Singletons</span>
                </div>
                <div>
                  <strong>{poolCount}</strong>
                  <span>Pools</span>
                </div>
              </div>
            </section>
            <section className="actor-system-summary-card">
              <p className="eyebrow">Pressure</p>
              <h4>Mailbox Load</h4>
              <div className="actor-system-summary-metrics">
                <div>
                  <strong>{queuedMailboxCount}</strong>
                  <span>Queued</span>
                </div>
                <div>
                  <strong>{failedMailboxCount}</strong>
                  <span>Failed</span>
                </div>
              </div>
            </section>
            <section className="actor-system-summary-card">
              <p className="eyebrow">Execution</p>
              <h4>Thread Pool</h4>
              <div className="actor-system-summary-metrics">
                <div>
                  <strong>{poolWorkerCount}</strong>
                  <span>Workers</span>
                </div>
                <div>
                  <strong>{busyWorkerCount}</strong>
                  <span>Busy</span>
                </div>
                <div>
                  <strong>{idleWorkerCount}</strong>
                  <span>Idle</span>
                </div>
                <div>
                  <strong>{runtimeQueueDepth}</strong>
                  <span>Queued Jobs</span>
                </div>
              </div>
            </section>
            <section className="actor-system-summary-card actor-system-summary-card-wide">
              <p className="eyebrow">Most Active Flows</p>
              <h4>Workflow Hotspots</h4>
              <div className="entity-list actor-system-compact-list">
                {topWorkflowEdges.length > 0 ? (
                  topWorkflowEdges.map((edge, index) => {
                    const sender = stringValue(edge.fromActorId ?? edge.senderActorId, "unknown");
                    const receiver = stringValue(edge.toActorId ?? edge.receiverActorId, "unknown");
                    const operation = stringValue(edge.operation ?? edge.target, "message");
                    const count = numericValue(edge.messageCount ?? edge.recentCount);
                    return (
                      <div className="entity-row" key={`overview-edge:${sender}:${receiver}:${index}`}>
                        <div>
                          <strong>{`${sender} → ${receiver}`}</strong>
                          <p>{operation}</p>
                        </div>
                        <div className="entity-meta">
                          <Badge tone="steady">{String(count)}</Badge>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="list-empty">No actor traffic has been recorded yet.</p>
                )}
              </div>
            </section>
          </div>
        </section>
      ) : null}
      {selectedTab === "hierarchy" ? (
        <section className="actor-system-detail-panel">
          <div className="panel-header actor-system-section-header">
            <div>
              <p className="eyebrow">Hierarchy</p>
              <p className="panel-subtitle">Actors anchored under the system root with allocation, execution posture, and live mailbox pressure.</p>
            </div>
            <Badge tone="steady">{String(hierarchyEdges.length)}</Badge>
          </div>
          <ActorHierarchyGraph actors={sortedActors} hierarchyEdges={hierarchyEdges} rootActorId={rootActorId} />
        </section>
      ) : null}
      {selectedTab === "workflow" ? (
        <section className="actor-system-detail-panel">
          <div className="panel-header actor-system-section-header">
            <div>
              <p className="eyebrow">Workflow</p>
              <p className="panel-subtitle">Asynchronous actor-to-actor sends observed in the current runtime packet.</p>
            </div>
            <Badge tone="active">{String(workflowEdges.length)}</Badge>
          </div>
          <ActorWorkflowGraph actors={sortedActors} workflowEdges={workflowEdges} />
        </section>
      ) : null}
      {selectedTab === "supervision" ? (
        <section className="actor-system-detail-panel">
          <div className="panel-header actor-system-section-header">
            <div>
              <p className="eyebrow">Supervision</p>
              <p className="panel-subtitle">Parent-owned failures and the actions that are currently driving recovery.</p>
            </div>
            <Badge tone={openIncidents.length > 0 ? "danger" : "active"}>{String(openIncidents.length)}</Badge>
          </div>
          <div className="entity-list">
            {supervisionIncidents.length > 0 ? (
              supervisionIncidents.map((incident) => {
                const incidentId = stringValue(incident.incidentId, "incident");
                const actorId = stringValue(incident.actorId, "actor");
                const actor = actorById.get(actorId);
                const title = actor
                  ? stringValue(actor.displayName ?? actor.label, actorId)
                  : actorId;
                const action = stringValue(incident.action, "review");
                const parentActorId = stringValue(incident.parentActorId, rootActorId);
                const tone = incident.openP === false ? "steady" : action === "quarantine" ? "danger" : "warning";
                return (
                  <div className="entity-row" key={`incident:${incidentId}`}>
                    <div>
                      <strong>{title}</strong>
                      <p>{`${incidentId} · parent ${parentActorId}`}</p>
                    </div>
                    <div className="entity-meta">
                      <Badge tone={tone}>{action}</Badge>
                      <span>{incident.openP === false ? "resolved" : "open"}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="list-empty">No supervision incidents are currently open.</p>
            )}
          </div>
        </section>
      ) : null}
    </section>
  );
}

type ActorHierarchyGraphProps = {
  actors: Record<string, unknown>[];
  hierarchyEdges: Record<string, unknown>[];
  rootActorId: string;
};

type GraphNode = {
  actorId: string;
  label: string;
  parentActorId: string | null;
  allocation: string;
  executionModel: string;
  childCount: number;
  inboxDepth: number;
  outboxDepth: number;
  queuedMailboxCount: number;
  failedMailboxCount: number;
  openIncidentCount: number;
  runtimeWorkerCount: number;
  runtimeBusyWorkerCount: number;
  runtimeIdleWorkerCount: number;
  runtimeQueueDepth: number;
  runtimeActiveActorCount: number;
  runtimeSubmittedJobCount: number;
  runtimeCompletedJobCount: number;
  runtimeFailedJobCount: number;
  x: number;
  y: number;
};

type GraphEdge = {
  key: string;
  fromActorId: string;
  toActorId: string;
};

type WorkflowNode = {
  actorId: string;
  label: string;
  lane: "sender" | "receiver";
  x: number;
  y: number;
  sentCount: number;
  receivedCount: number;
};

type WorkflowEdge = {
  key: string;
  fromActorId: string;
  toActorId: string;
  operation: string;
  messageCount: number;
};

function ActorHierarchyGraph({
  actors,
  hierarchyEdges,
  rootActorId
}: ActorHierarchyGraphProps) {
  const minimumCanvasWidth = 1600;
  const minimumCanvasHeight = 1100;
  const actorById = useMemo(
    () => new Map(actors.map((actor) => [stringValue(actor.id ?? actor.actorId, ""), actor])),
    [actors]
  );

  const { nodes, edges } = useMemo(() => {
    const explicitEdges = hierarchyEdges.map((edge, index) => ({
      key: `edge:${index}`,
      fromActorId: stringValue(edge.parentActorId, ""),
      toActorId: stringValue(edge.childActorId ?? edge.actorId, "")
    })).filter((edge) => edge.fromActorId.length > 0 && edge.toActorId.length > 0);

    const edgeSet = new Set(explicitEdges.map((edge) => `${edge.fromActorId}->${edge.toActorId}`));
    const derivedEdges = actors
      .map((actor, index) => {
        const actorId = stringValue(actor.id ?? actor.actorId, "");
        const parentActorId = stringValue(actor.parentActorId, "");
        if (!actorId || !parentActorId || parentActorId === actorId) {
          return null;
        }
        const key = `${parentActorId}->${actorId}`;
        if (edgeSet.has(key)) {
          return null;
        }
        return {
          key: `derived-edge:${index}`,
          fromActorId: parentActorId,
          toActorId: actorId
        };
      })
      .filter((edge): edge is GraphEdge => edge !== null);

    const allEdges = [...explicitEdges, ...derivedEdges];
    const childrenByParent = new Map<string, string[]>();
    for (const edge of allEdges) {
      const next = childrenByParent.get(edge.fromActorId) ?? [];
      next.push(edge.toActorId);
      childrenByParent.set(edge.fromActorId, next);
    }

    const visited = new Set<string>();
    const levels = new Map<string, number>();
    const queue: Array<{ actorId: string; depth: number }> = [];
    if (rootActorId.length > 0) {
      queue.push({ actorId: rootActorId, depth: 0 });
      visited.add(rootActorId);
      levels.set(rootActorId, 0);
    }
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) {
        break;
      }
      for (const childId of childrenByParent.get(current.actorId) ?? []) {
        if (visited.has(childId)) {
          continue;
        }
        visited.add(childId);
        levels.set(childId, current.depth + 1);
        queue.push({ actorId: childId, depth: current.depth + 1 });
      }
    }

    const remainingIds = actors
      .map((actor) => stringValue(actor.id ?? actor.actorId, ""))
      .filter((actorId) => actorId.length > 0 && !visited.has(actorId));
    remainingIds.forEach((actorId, index) => {
      levels.set(actorId, (levels.get(rootActorId) ?? 0) + 1 + index);
    });

    const depthBuckets = new Map<number, string[]>();
    for (const actor of actors) {
      const actorId = stringValue(actor.id ?? actor.actorId, "");
      if (!actorId) {
        continue;
      }
      const depth = levels.get(actorId) ?? 0;
      const bucket = depthBuckets.get(depth) ?? [];
      bucket.push(actorId);
      depthBuckets.set(depth, bucket);
    }

    const nextNodes: GraphNode[] = [];
    const columnWidths = 300;
    const rowHeights = 120;
    const baseX = 80;
    const baseY = 90;
    const sortedDepths = [...depthBuckets.keys()].sort((left, right) => left - right);
    for (const depth of sortedDepths) {
      const bucket = (depthBuckets.get(depth) ?? []).sort((left, right) => {
        const leftActor = actorById.get(left);
        const rightActor = actorById.get(right);
        return stringValue(leftActor?.displayName ?? leftActor?.label, left).localeCompare(
          stringValue(rightActor?.displayName ?? rightActor?.label, right)
        );
      });
      bucket.forEach((actorId, rowIndex) => {
        const actor = actorById.get(actorId);
        const runtimeExecution = asRecord(actor?.runtimeExecution);
        nextNodes.push({
          actorId,
          label: stringValue(actor?.displayName ?? actor?.label, actorId),
          parentActorId: stringValue(actor?.parentActorId, "") || null,
          allocation: stringValue(asRecord(actor?.allocationStrategy)?.type, "singleton"),
          executionModel: stringValue(asRecord(actor?.executionPolicy)?.model, "serial"),
          childCount: childrenByParent.get(actorId)?.length ?? 0,
          inboxDepth: numericValue(asRecord(actor?.metrics)?.inboxDepth),
          outboxDepth: numericValue(asRecord(actor?.metrics)?.outboxDepth),
          queuedMailboxCount: numericValue(asRecord(actor?.metrics)?.queuedMailboxCount),
          failedMailboxCount: numericValue(asRecord(actor?.metrics)?.failedMailboxCount),
          openIncidentCount: numericValue(asRecord(actor?.metrics)?.openSupervisionIncidentCount),
          runtimeWorkerCount: numericValue(runtimeExecution?.workerCount),
          runtimeBusyWorkerCount: numericValue(runtimeExecution?.busyWorkerCount),
          runtimeIdleWorkerCount: numericValue(runtimeExecution?.idleWorkerCount),
          runtimeQueueDepth: numericValue(runtimeExecution?.queueDepth),
          runtimeActiveActorCount: numericValue(runtimeExecution?.activeActorCount),
          runtimeSubmittedJobCount: numericValue(runtimeExecution?.submittedJobCount),
          runtimeCompletedJobCount: numericValue(runtimeExecution?.completedJobCount),
          runtimeFailedJobCount: numericValue(runtimeExecution?.failedJobCount),
          x: baseX + depth * columnWidths,
          y: baseY + rowIndex * rowHeights
        });
      });
    }

    return { nodes: nextNodes, edges: allEdges };
  }, [actorById, actors, hierarchyEdges, rootActorId]);

  const [scale, setScale] = useState(1);
  const [nodeOffsets, setNodeOffsets] = useState<Record<string, { x: number; y: number }>>({});
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const scrollRegionRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<
    | {
        type: "scroll";
        startClientX: number;
        startClientY: number;
        originScrollLeft: number;
        originScrollTop: number;
      }
    | {
        type: "node";
        actorId: string;
        startClientX: number;
        startClientY: number;
        originX: number;
        originY: number;
      }
    | null
  >(null);

  const resolvedNodes = useMemo(
    () =>
      nodes.map((node) => {
        const offset = nodeOffsets[node.actorId] ?? { x: 0, y: 0 };
        return {
          ...node,
          x: node.x + offset.x,
          y: node.y + offset.y
        };
      }),
    [nodeOffsets, nodes]
  );
  const resolvedNodeById = useMemo(
    () => new Map(resolvedNodes.map((node) => [node.actorId, node])),
    [resolvedNodes]
  );
  const hoveredNode = hoveredNodeId ? resolvedNodeById.get(hoveredNodeId) ?? null : null;
  const canvasBounds = useMemo(() => {
    const nodeWidth = 184;
    const nodeHeight = 56;
    const padding = 120;
    const minX = resolvedNodes.reduce((current, node) => Math.min(current, node.x), 0);
    const minY = resolvedNodes.reduce((current, node) => Math.min(current, node.y), 0);
    const maxX = resolvedNodes.reduce((current, node) => Math.max(current, node.x + nodeWidth), 0);
    const maxY = resolvedNodes.reduce((current, node) => Math.max(current, node.y + nodeHeight), 0);
    return {
      offsetX: padding - minX,
      offsetY: padding - minY,
      width: Math.max(minimumCanvasWidth, maxX - minX + padding * 2),
      height: Math.max(minimumCanvasHeight, maxY - minY + padding * 2)
    };
  }, [resolvedNodes]);

  function beginCanvasDrag(event: React.PointerEvent<Element>): void {
    const target = event.target as Element | null;
    if (target?.closest(".actor-graph-node")) {
      return;
    }
    const container = scrollRegionRef.current;
    if (!container) {
      return;
    }
    dragStateRef.current = {
      type: "scroll",
      startClientX: event.clientX,
      startClientY: event.clientY,
      originScrollLeft: container.scrollLeft,
      originScrollTop: container.scrollTop
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function beginNodeDrag(actorId: string, event: React.PointerEvent<SVGGElement>): void {
    const existing = nodeOffsets[actorId] ?? { x: 0, y: 0 };
    dragStateRef.current = {
      type: "node",
      actorId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      originX: existing.x,
      originY: existing.y
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.stopPropagation();
  }

  function handlePointerMove(event: React.PointerEvent<Element>): void {
    const dragState = dragStateRef.current;
    if (!dragState) {
      return;
    }
    if (dragState.type === "scroll") {
      const container = scrollRegionRef.current;
      if (!container) {
        return;
      }
      container.scrollLeft = dragState.originScrollLeft - (event.clientX - dragState.startClientX);
      container.scrollTop = dragState.originScrollTop - (event.clientY - dragState.startClientY);
      return;
    }
    const deltaX = (event.clientX - dragState.startClientX) / scale;
    const deltaY = (event.clientY - dragState.startClientY) / scale;
    setNodeOffsets((current) => ({
      ...current,
      [dragState.actorId]: {
        x: dragState.originX + deltaX,
        y: dragState.originY + deltaY
      }
    }));
  }

  function endDrag(): void {
    dragStateRef.current = null;
  }

  function handleWheel(event: React.WheelEvent<SVGSVGElement>): void {
    event.preventDefault();
    const direction = event.deltaY > 0 ? -0.08 : 0.08;
    setScale((current) => Math.max(0.45, Math.min(2.2, current + direction)));
  }

  if (resolvedNodes.length === 0) {
    return <p className="list-empty">No actor hierarchy is currently available.</p>;
  }

  return (
    <div className="actor-graph-shell">
      <div className="actor-graph-toolbar">
        <div className="ref-list">
          <span className="thread-flag">Drag canvas to pan</span>
          <span className="thread-flag">Drag nodes to reposition</span>
          <span className="thread-flag">Wheel to zoom</span>
        </div>
        <div className="actor-graph-zoom-controls">
          <button className="starter-chip" onClick={() => setScale((current) => Math.max(0.45, current - 0.15))} type="button">
            -
          </button>
          <span>{`${Math.round(scale * 100)}%`}</span>
          <button className="starter-chip" onClick={() => setScale((current) => Math.min(2.2, current + 0.15))} type="button">
            +
          </button>
          <button className="starter-chip" onClick={() => {
            setScale(1);
            setNodeOffsets({});
          }} type="button">
            Reset
          </button>
        </div>
      </div>
      <div className="actor-graph-layout">
        <div
          className={`actor-graph-canvas-wrap${dragStateRef.current?.type === "scroll" ? " is-panning" : ""}`}
          onPointerDown={beginCanvasDrag}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
          ref={scrollRegionRef}
        >
          <svg
            className="actor-graph-canvas"
            onWheel={handleWheel}
            viewBox={`0 0 ${canvasBounds.width} ${canvasBounds.height}`}
            width={canvasBounds.width * scale}
            height={canvasBounds.height * scale}
          >
            <rect x="0" y="0" width={canvasBounds.width} height={canvasBounds.height} className="actor-graph-bg" />
            <g transform={`translate(${canvasBounds.offsetX} ${canvasBounds.offsetY})`}>
              {edges.map((edge) => {
                const fromNode = resolvedNodeById.get(edge.fromActorId);
                const toNode = resolvedNodeById.get(edge.toActorId);
                if (!fromNode || !toNode) {
                  return null;
                }
                return (
                  <line
                    key={edge.key}
                    className="actor-graph-edge"
                    x1={fromNode.x + 92}
                    y1={fromNode.y + 28}
                    x2={toNode.x + 92}
                    y2={toNode.y + 28}
                  />
                );
              })}
              {resolvedNodes.map((node) => {
                const isHovered = hoveredNodeId === node.actorId;
                return (
                  <g
                    key={node.actorId}
                    className={`actor-graph-node${isHovered ? " is-hovered" : ""}`}
                    onPointerDown={(event) => beginNodeDrag(node.actorId, event)}
                    onPointerEnter={() => setHoveredNodeId(node.actorId)}
                    onPointerLeave={() => setHoveredNodeId((current) => (current === node.actorId ? null : current))}
                    transform={`translate(${node.x} ${node.y})`}
                  >
                    <rect className="actor-graph-node-card" rx="16" ry="16" width="184" height="56" />
                    <text className="actor-graph-node-title" x="14" y="22">
                      {node.label}
                    </text>
                    <text className="actor-graph-node-meta" x="14" y="40">
                      {`${node.allocation} · ${node.executionModel} · ${node.childCount} child${node.childCount === 1 ? "" : "ren"}`}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
        <aside className="actor-graph-inspector">
          <p className="eyebrow">Node Detail</p>
          {hoveredNode ? (
            <>
              <h4>{hoveredNode.label}</h4>
              <dl className="detail-list">
                {[
                  ["Actor Id", hoveredNode.actorId],
                  ["Parent", hoveredNode.parentActorId ?? rootActorId],
                  ["Allocation", hoveredNode.allocation],
                  ["Execution", hoveredNode.executionModel],
                  ["Children", String(hoveredNode.childCount)],
                  ["Inbox Depth", String(hoveredNode.inboxDepth)],
                  ["Outbox Depth", String(hoveredNode.outboxDepth)],
                  ["Queued Mailbox", String(hoveredNode.queuedMailboxCount)],
                  ["Failed Mailbox", String(hoveredNode.failedMailboxCount)],
                  ["Open Incidents", String(hoveredNode.openIncidentCount)],
                  ["Pool Workers", String(hoveredNode.runtimeWorkerCount)],
                  ["Busy Workers", String(hoveredNode.runtimeBusyWorkerCount)],
                  ["Idle Workers", String(hoveredNode.runtimeIdleWorkerCount)],
                  ["Runtime Queue", String(hoveredNode.runtimeQueueDepth)],
                  ["Active Runtime Actors", String(hoveredNode.runtimeActiveActorCount)],
                  ["Submitted Jobs", String(hoveredNode.runtimeSubmittedJobCount)],
                  ["Completed Jobs", String(hoveredNode.runtimeCompletedJobCount)],
                  ["Failed Jobs", String(hoveredNode.runtimeFailedJobCount)]
                ].map(([label, value]) => (
                  <div className="detail-row" key={`actor-graph:${label}`}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </>
          ) : (
            <p className="list-empty">Hover a node to inspect its actor details.</p>
          )}
        </aside>
      </div>
    </div>
  );
}

function ActorWorkflowGraph({
  actors,
  workflowEdges
}: {
  actors: Record<string, unknown>[];
  workflowEdges: Record<string, unknown>[];
}) {
  const minimumCanvasWidth = 1500;
  const minimumCanvasHeight = 900;
  const actorById = useMemo(
    () => new Map(actors.map((actor) => [stringValue(actor.id ?? actor.actorId, ""), actor])),
    [actors]
  );
  const [scale, setScale] = useState(1);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredEdgeKey, setHoveredEdgeKey] = useState<string | null>(null);
  const scrollRegionRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<
    | {
        type: "scroll";
        startClientX: number;
        startClientY: number;
        originScrollLeft: number;
        originScrollTop: number;
      }
    | null
  >(null);

  const { nodes, edges, canvasWidth, canvasHeight } = useMemo(() => {
    const normalizedEdges: WorkflowEdge[] = workflowEdges.map((edge, index) => ({
      key: `workflow-edge:${index}`,
      fromActorId: stringValue(edge.fromActorId ?? edge.senderActorId, ""),
      toActorId: stringValue(edge.toActorId ?? edge.receiverActorId, ""),
      operation: stringValue(edge.operation ?? edge.target, "message"),
      messageCount: numericValue(edge.messageCount ?? edge.recentCount)
    })).filter((edge) => edge.fromActorId.length > 0 && edge.toActorId.length > 0);

    const sentCounts = new Map<string, number>();
    const receivedCounts = new Map<string, number>();
    for (const edge of normalizedEdges) {
      sentCounts.set(edge.fromActorId, (sentCounts.get(edge.fromActorId) ?? 0) + edge.messageCount);
      receivedCounts.set(edge.toActorId, (receivedCounts.get(edge.toActorId) ?? 0) + edge.messageCount);
    }

    const senderIds = [...new Set(normalizedEdges.map((edge) => edge.fromActorId))].sort((left, right) => {
      const leftLabel = stringValue(actorById.get(left)?.displayName ?? actorById.get(left)?.label, left);
      const rightLabel = stringValue(actorById.get(right)?.displayName ?? actorById.get(right)?.label, right);
      return leftLabel.localeCompare(rightLabel);
    });
    const receiverIds = [...new Set(normalizedEdges.map((edge) => edge.toActorId))].sort((left, right) => {
      const leftLabel = stringValue(actorById.get(left)?.displayName ?? actorById.get(left)?.label, left);
      const rightLabel = stringValue(actorById.get(right)?.displayName ?? actorById.get(right)?.label, right);
      return leftLabel.localeCompare(rightLabel);
    });

    const laneTop = 90;
    const laneGap = 104;
    const senderX = 140;
    const receiverX = 860;
    const nextNodes: WorkflowNode[] = [
      ...senderIds.map((actorId, index) => ({
        actorId,
        label: stringValue(actorById.get(actorId)?.displayName ?? actorById.get(actorId)?.label, actorId),
        lane: "sender" as const,
        x: senderX,
        y: laneTop + index * laneGap,
        sentCount: sentCounts.get(actorId) ?? 0,
        receivedCount: receivedCounts.get(actorId) ?? 0
      })),
      ...receiverIds
        .filter((actorId) => !senderIds.includes(actorId))
        .map((actorId, index) => ({
          actorId,
          label: stringValue(actorById.get(actorId)?.displayName ?? actorById.get(actorId)?.label, actorId),
          lane: "receiver" as const,
          x: receiverX,
          y: laneTop + index * laneGap,
          sentCount: sentCounts.get(actorId) ?? 0,
          receivedCount: receivedCounts.get(actorId) ?? 0
        })),
      ...receiverIds
        .filter((actorId) => senderIds.includes(actorId))
        .map((actorId, index) => ({
          actorId,
          label: stringValue(actorById.get(actorId)?.displayName ?? actorById.get(actorId)?.label, actorId),
          lane: "receiver" as const,
          x: receiverX,
          y: laneTop + index * laneGap,
          sentCount: sentCounts.get(actorId) ?? 0,
          receivedCount: receivedCounts.get(actorId) ?? 0
        }))
    ];

    const maxRows = Math.max(senderIds.length, receiverIds.length, 1);
    return {
      nodes: nextNodes,
      edges: normalizedEdges,
      canvasWidth: minimumCanvasWidth,
      canvasHeight: Math.max(minimumCanvasHeight, laneTop * 2 + maxRows * laneGap)
    };
  }, [actorById, workflowEdges]);

  const nodeByKey = useMemo(
    () => new Map(nodes.map((node) => [`${node.lane}:${node.actorId}`, node])),
    [nodes]
  );
  const hoveredNode = hoveredNodeId ? nodes.find((node) => `${node.lane}:${node.actorId}` === hoveredNodeId) ?? null : null;
  const hoveredEdge = hoveredEdgeKey ? edges.find((edge) => edge.key === hoveredEdgeKey) ?? null : null;

  function beginCanvasDrag(event: React.PointerEvent<Element>): void {
    const target = event.target as Element | null;
    if (target?.closest(".actor-workflow-node")) {
      return;
    }
    const container = scrollRegionRef.current;
    if (!container) {
      return;
    }
    dragStateRef.current = {
      type: "scroll",
      startClientX: event.clientX,
      startClientY: event.clientY,
      originScrollLeft: container.scrollLeft,
      originScrollTop: container.scrollTop
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<Element>): void {
    const dragState = dragStateRef.current;
    if (!dragState) {
      return;
    }
    const container = scrollRegionRef.current;
    if (!container) {
      return;
    }
    container.scrollLeft = dragState.originScrollLeft - (event.clientX - dragState.startClientX);
    container.scrollTop = dragState.originScrollTop - (event.clientY - dragState.startClientY);
  }

  function endDrag(): void {
    dragStateRef.current = null;
  }

  function handleWheel(event: React.WheelEvent<SVGSVGElement>): void {
    event.preventDefault();
    const direction = event.deltaY > 0 ? -0.08 : 0.08;
    setScale((current) => Math.max(0.45, Math.min(2.2, current + direction)));
  }

  if (edges.length === 0) {
    return <p className="list-empty">No workflow edges have been recorded yet.</p>;
  }

  return (
    <div className="actor-workflow-shell">
      <div className="actor-graph-toolbar">
        <div className="ref-list">
          <span className="thread-flag">Drag canvas to pan</span>
          <span className="thread-flag">Wheel to zoom</span>
          <span className="thread-flag">Hover nodes and links to inspect flow</span>
        </div>
        <div className="actor-graph-zoom-controls">
          <button className="starter-chip" onClick={() => setScale((current) => Math.max(0.45, current - 0.15))} type="button">
            -
          </button>
          <span>{`${Math.round(scale * 100)}%`}</span>
          <button className="starter-chip" onClick={() => setScale((current) => Math.min(2.2, current + 0.15))} type="button">
            +
          </button>
          <button className="starter-chip" onClick={() => setScale(1)} type="button">
            Reset
          </button>
        </div>
      </div>
      <div className="actor-graph-layout actor-workflow-layout">
        <div
          className={`actor-graph-canvas-wrap${dragStateRef.current?.type === "scroll" ? " is-panning" : ""}`}
          onPointerDown={beginCanvasDrag}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
          ref={scrollRegionRef}
        >
          <svg
            className="actor-graph-canvas"
            onWheel={handleWheel}
            viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
            width={canvasWidth * scale}
            height={canvasHeight * scale}
          >
            <rect x="0" y="0" width={canvasWidth} height={canvasHeight} className="actor-graph-bg" />
            <text className="actor-workflow-lane-label" x="140" y="50">Senders</text>
            <text className="actor-workflow-lane-label" x="860" y="50">Receivers</text>
            {edges.map((edge) => {
              const fromNode = nodeByKey.get(`sender:${edge.fromActorId}`);
              const receiverKey = nodeByKey.has(`receiver:${edge.toActorId}`) ? `receiver:${edge.toActorId}` : `sender:${edge.toActorId}`;
              const toNode = nodeByKey.get(receiverKey);
              if (!fromNode || !toNode) {
                return null;
              }
              const isHovered = hoveredEdgeKey === edge.key;
              return (
                <g
                  key={edge.key}
                  className={`actor-workflow-edge${isHovered ? " is-hovered" : ""}`}
                  onPointerEnter={() => setHoveredEdgeKey(edge.key)}
                  onPointerLeave={() => setHoveredEdgeKey((current) => (current === edge.key ? null : current))}
                >
                  <path
                    className="actor-workflow-edge-path"
                    d={`M ${fromNode.x + 184} ${fromNode.y + 28} C ${fromNode.x + 360} ${fromNode.y + 28}, ${toNode.x - 180} ${toNode.y + 28}, ${toNode.x} ${toNode.y + 28}`}
                  />
                  <text
                    className="actor-workflow-edge-label"
                    x={(fromNode.x + toNode.x + 184) / 2}
                    y={(fromNode.y + toNode.y) / 2 + 12}
                  >
                    {edge.operation}
                  </text>
                </g>
              );
            })}
            {nodes.map((node) => {
              const isHovered = hoveredNodeId === `${node.lane}:${node.actorId}`;
              const toneClass = node.lane === "sender" ? "is-sender" : "is-receiver";
              return (
                <g
                  key={`${node.lane}:${node.actorId}`}
                  className={`actor-workflow-node ${toneClass}${isHovered ? " is-hovered" : ""}`}
                  onPointerEnter={() => setHoveredNodeId(`${node.lane}:${node.actorId}`)}
                  onPointerLeave={() => setHoveredNodeId((current) => (current === `${node.lane}:${node.actorId}` ? null : current))}
                  transform={`translate(${node.x} ${node.y})`}
                >
                  <rect className="actor-graph-node-card" rx="16" ry="16" width="184" height="56" />
                  <text className="actor-graph-node-title" x="14" y="22">
                    {node.label}
                  </text>
                  <text className="actor-graph-node-meta" x="14" y="40">
                    {`${node.sentCount} sent · ${node.receivedCount} received`}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        <aside className="actor-graph-inspector">
          <p className="eyebrow">Flow Detail</p>
          {hoveredEdge ? (
            <>
              <h4>{hoveredEdge.operation}</h4>
              <dl className="detail-list">
                {[
                  ["Sender", hoveredEdge.fromActorId],
                  ["Receiver", hoveredEdge.toActorId],
                  ["Operation", hoveredEdge.operation],
                  ["Messages", String(hoveredEdge.messageCount)]
                ].map(([label, value]) => (
                  <div className="detail-row" key={`actor-workflow-edge:${label}`}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </>
          ) : hoveredNode ? (
            <>
              <h4>{hoveredNode.label}</h4>
              <dl className="detail-list">
                {[
                  ["Actor Id", hoveredNode.actorId],
                  ["Lane", hoveredNode.lane],
                  ["Sent", String(hoveredNode.sentCount)],
                  ["Received", String(hoveredNode.receivedCount)]
                ].map(([label, value]) => (
                  <div className="detail-row" key={`actor-workflow-node:${label}`}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </>
          ) : (
            <p className="list-empty">Hover a workflow node or edge to inspect the message flow.</p>
          )}
        </aside>
      </div>
    </div>
  );
}

export function FilterSelect({
  label,
  options,
  value,
  onChange
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="filter-select">
      <span className="context-label">{label}</span>
      <select className="filter-input" onChange={(event) => onChange(event.target.value)} value={value}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
