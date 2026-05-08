import { useEffect, useMemo, useState } from "react";
import type { MemoryEntryDto } from "../../shared/contracts";
import { BrowserDataTable } from "./browser-data-table";
import { DetailRow } from "./journey-support";
import { Badge, PanelHeader } from "./surface-support";

export function MemoryWorkspace({
  memories,
  selectedMemoryId,
  setSelectedMemoryId,
  onDeleteMemory,
  onUpdateMemory,
  pendingDeleteMemoryId,
  pendingUpdateMemoryId
}: {
  memories: MemoryEntryDto[];
  selectedMemoryId: string | null;
  setSelectedMemoryId: (value: string | null) => void;
  onDeleteMemory: (memoryId: string) => Promise<void>;
  onUpdateMemory: (input: {
    memoryId: string;
    category: string;
    attribute: string;
    value: string;
    summary: string;
    confidence: number | null;
  }) => Promise<void>;
  pendingDeleteMemoryId: string | null;
  pendingUpdateMemoryId: string | null;
}) {
  const selectedMemory =
    memories.find((entry) => entry.memoryId === selectedMemoryId) ??
    memories[0] ??
    null;
  const [draftCategory, setDraftCategory] = useState("");
  const [draftAttribute, setDraftAttribute] = useState("");
  const [draftValue, setDraftValue] = useState("");
  const [draftSummary, setDraftSummary] = useState("");
  const [draftConfidence, setDraftConfidence] = useState("");

  useEffect(() => {
    const nextMemoryId = memories[0]?.memoryId ?? null;
    if (!selectedMemoryId || !memories.some((entry) => entry.memoryId === selectedMemoryId)) {
      setSelectedMemoryId(nextMemoryId);
    }
  }, [memories, selectedMemoryId, setSelectedMemoryId]);

  useEffect(() => {
    setDraftCategory(selectedMemory?.category ?? "");
    setDraftAttribute(selectedMemory?.attribute ?? "");
    setDraftValue(selectedMemory?.value ?? "");
    setDraftSummary(selectedMemory?.summary ?? "");
    setDraftConfidence(
      typeof selectedMemory?.confidence === "number" ? String(selectedMemory.confidence) : ""
    );
  }, [selectedMemory?.attribute, selectedMemory?.category, selectedMemory?.confidence, selectedMemory?.memoryId, selectedMemory?.summary, selectedMemory?.value]);

  const categoryOptions = useMemo(
    () =>
      Array.from(new Set(memories.map((entry) => entry.category)))
        .sort((left, right) => left.localeCompare(right))
        .map((value) => ({ label: value, value })),
    [memories]
  );

  return (
    <div className="transcript-journey">
      <div className="runtime-grid">
        <section className="panel runtime-scope-panel">
          <PanelHeader
            title="Memory Entries"
            subtitle="Deliberate operator memories stay editable, inspectable, and persistent instead of remaining implicit retrieval state."
          />
          <BrowserDataTable
            key="memory-entries"
            columnTemplate="minmax(0, 0.75fr) minmax(0, 0.9fr) minmax(0, 1fr) minmax(0, 1.35fr)"
            columns={[
              {
                id: "category",
                label: "Category",
                render: (row) => <Badge tone="steady">{row.category}</Badge>,
                sortValue: (row) => row.category
              },
              {
                id: "attribute",
                label: "Attribute",
                render: (row) => <strong>{row.attribute}</strong>,
                sortValue: (row) => row.attribute,
                searchValue: (row) => `${row.category} ${row.attribute} ${row.value} ${row.summary}`
              },
              {
                id: "value",
                label: "Value",
                render: (row) => row.value,
                sortValue: (row) => row.value,
                searchValue: (row) => row.value
              },
              {
                id: "summary",
                label: "Summary",
                render: (row) => row.summary,
                sortValue: (row) => row.summary,
                searchValue: (row) => row.summary
              }
            ]}
            emptyMessage="No deliberate memories have been retained yet."
            filterLabel="Category"
            filterOptions={categoryOptions}
            getFilterValue={(row) => row.category}
            getRowKey={(row) => row.memoryId}
            onSelect={(row) => setSelectedMemoryId(row.memoryId)}
            rows={memories}
            searchPlaceholder="Search retained memories"
            selectedKey={selectedMemory?.memoryId ?? null}
          />
        </section>

        <section className="panel runtime-result-panel">
          <PanelHeader
            title="Memory Detail"
            subtitle="Drill into a retained memory, revise it deliberately, or delete it when it no longer reflects the operator."
          />
          {selectedMemory ? (
            <div className="configuration-inspector-stack">
              <dl className="detail-list">
                <DetailRow label="Memory Id" value={selectedMemory.memoryId} />
                <DetailRow label="Kind" value={selectedMemory.kind} />
                <DetailRow label="Source Turn" value={selectedMemory.sourceTurnId ?? "n/a"} />
                <DetailRow label="Recorded" value={selectedMemory.recordedAt ?? "n/a"} />
                <DetailRow label="Updated" value={selectedMemory.updatedAt ?? "n/a"} />
              </dl>

              <label className="browser-table-select-group">
                <span className="context-label">Category</span>
                <input
                  className="filter-input"
                  onChange={(event) => setDraftCategory(event.target.value)}
                  value={draftCategory}
                />
              </label>
              <label className="browser-table-select-group">
                <span className="context-label">Attribute</span>
                <input
                  className="filter-input"
                  onChange={(event) => setDraftAttribute(event.target.value)}
                  value={draftAttribute}
                />
              </label>
              <label className="browser-table-select-group">
                <span className="context-label">Value</span>
                <input
                  className="filter-input"
                  onChange={(event) => setDraftValue(event.target.value)}
                  value={draftValue}
                />
              </label>
              <label className="browser-table-select-group">
                <span className="context-label">Confidence</span>
                <input
                  className="filter-input"
                  max="1"
                  min="0"
                  onChange={(event) => setDraftConfidence(event.target.value)}
                  step="0.01"
                  type="number"
                  value={draftConfidence}
                />
              </label>
              <label className="browser-table-select-group">
                <span className="context-label">Summary</span>
                <textarea
                  className="runtime-editor"
                  onChange={(event) => setDraftSummary(event.target.value)}
                  rows={6}
                  value={draftSummary}
                />
              </label>
              <div className="browser-action-strip">
                <button
                  className="starter-chip"
                  disabled={pendingUpdateMemoryId === selectedMemory.memoryId}
                  onClick={() =>
                    void onUpdateMemory({
                      memoryId: selectedMemory.memoryId,
                      category: draftCategory,
                      attribute: draftAttribute,
                      value: draftValue,
                      summary: draftSummary,
                      confidence: draftConfidence.trim().length > 0 ? Number(draftConfidence) : null
                    })
                  }
                  type="button"
                >
                  {pendingUpdateMemoryId === selectedMemory.memoryId ? "Saving..." : "Save Memory"}
                </button>
                <button
                  className="starter-chip"
                  onClick={() => {
                    setDraftCategory(selectedMemory.category);
                    setDraftAttribute(selectedMemory.attribute);
                    setDraftValue(selectedMemory.value);
                    setDraftSummary(selectedMemory.summary);
                    setDraftConfidence(
                      typeof selectedMemory.confidence === "number"
                        ? String(selectedMemory.confidence)
                        : ""
                    );
                  }}
                  type="button"
                >
                  Reset Draft
                </button>
                <button
                  className="starter-chip"
                  disabled={pendingDeleteMemoryId === selectedMemory.memoryId}
                  onClick={() => void onDeleteMemory(selectedMemory.memoryId)}
                  type="button"
                >
                  {pendingDeleteMemoryId === selectedMemory.memoryId ? "Deleting..." : "Delete Memory"}
                </button>
              </div>
            </div>
          ) : (
            <p className="list-empty">Select a memory entry to inspect and maintain it.</p>
          )}
        </section>
      </div>
    </div>
  );
}
