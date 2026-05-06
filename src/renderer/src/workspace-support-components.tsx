import type { DocumentationPageSummaryDto, WorkspaceId } from "../../shared/contracts";
import { BrowserDataTable } from "./browser-data-table";
import { Badge, PanelHeader } from "./surface-support";
import { labelForWorkspace } from "./workspace-shell";

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
