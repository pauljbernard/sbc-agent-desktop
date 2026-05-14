import { useEffect, useMemo, useState, type ReactNode } from "react";

export interface BrowserTableColumn<Row> {
  id: string;
  label: string;
  render: (row: Row) => ReactNode;
  sortValue: (row: Row) => string | number;
  searchValue?: (row: Row) => string;
}

export interface BrowserTableFilterOption {
  label: string;
  value: string;
}

export function BrowserDataTable<Row>({
  rows,
  columns,
  columnTemplate,
  emptyMessage,
  filterLabel,
  filterOptions,
  getFilterValue,
  getRowKey,
  onSelect,
  searchPlaceholder,
  selectedKey,
  toolbarLeading,
  initialSortColumnId,
  initialSortDirection = "asc",
  remotePagination
}: {
  rows: Row[];
  columns: BrowserTableColumn<Row>[];
  columnTemplate: string;
  emptyMessage: string;
  filterLabel: string;
  filterOptions: BrowserTableFilterOption[];
  getFilterValue: (row: Row) => string;
  getRowKey: (row: Row) => string;
  onSelect: (row: Row) => void;
  searchPlaceholder: string;
  selectedKey: string | null;
  toolbarLeading?: ReactNode;
  initialSortColumnId?: string;
  initialSortDirection?: "asc" | "desc";
  remotePagination?: {
    totalRowCount: number;
    page: number;
    pageSize: number;
    searchTerm: string;
    activeFilter: string;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
    onSearchTermChange: (value: string) => void;
    onFilterChange: (value: string) => void;
  };
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [sortColumnId, setSortColumnId] = useState(initialSortColumnId ?? columns[0]?.id ?? "default");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(initialSortDirection);
  const [pageSize, setPageSize] = useState(8);
  const [page, setPage] = useState(1);
  const effectiveSearchTerm = remotePagination ? remotePagination.searchTerm : searchTerm;
  const effectiveActiveFilter = remotePagination ? remotePagination.activeFilter : activeFilter;
  const effectivePageSize = remotePagination ? remotePagination.pageSize : pageSize;
  const effectivePage = remotePagination ? remotePagination.page : page;

  const sortColumn = columns.find((column) => column.id === sortColumnId) ?? columns[0];
  const normalizedSearch = effectiveSearchTerm.trim().toLowerCase();

  const filteredRows = useMemo(
    () =>
      remotePagination
        ? rows
        :
      rows.filter((row) => {
        const matchesFilter = effectiveActiveFilter === "all" || getFilterValue(row) === effectiveActiveFilter;
        if (!matchesFilter) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        return columns.some((column) => {
          const haystack = (column.searchValue?.(row) ?? String(column.sortValue(row))).toLowerCase();
          return haystack.includes(normalizedSearch);
        });
      }),
    [columns, effectiveActiveFilter, getFilterValue, normalizedSearch, remotePagination, rows]
  );

  const sortedRows = useMemo(() => {
    if (remotePagination) {
      return filteredRows;
    }
    if (!sortColumn) {
      return filteredRows;
    }

    return [...filteredRows].sort((left, right) => {
      const leftValue = sortColumn.sortValue(left);
      const rightValue = sortColumn.sortValue(right);

      if (typeof leftValue === "number" && typeof rightValue === "number") {
        return sortDirection === "asc" ? leftValue - rightValue : rightValue - leftValue;
      }

      const comparison = String(leftValue).localeCompare(String(rightValue), undefined, {
        numeric: true,
        sensitivity: "base"
      });
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredRows, sortColumn, sortDirection]);

  const totalRows = remotePagination ? remotePagination.totalRowCount : sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / effectivePageSize));
  const pagedRows = remotePagination
    ? sortedRows
    : sortedRows.slice((effectivePage - 1) * effectivePageSize, effectivePage * effectivePageSize);

  useEffect(() => {
    if (!remotePagination) {
      setPage(1);
    }
  }, [normalizedSearch, pageSize, remotePagination, sortColumnId, sortDirection, activeFilter]);

  useEffect(() => {
    if (!remotePagination && page > totalPages) {
      setPage(totalPages);
    }
  }, [page, remotePagination, totalPages]);

  function toggleSort(columnId: string): void {
    if (sortColumnId === columnId) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortColumnId(columnId);
    setSortDirection("asc");
  }

  return (
    <section className="browser-table-shell">
      <div className="browser-table-toolbar">
        {toolbarLeading ? <div className="browser-table-leading">{toolbarLeading}</div> : null}
        <input
          className="filter-input browser-table-search"
          aria-label={searchPlaceholder}
          onChange={(event) =>
            remotePagination
              ? remotePagination.onSearchTermChange(event.target.value)
              : setSearchTerm(event.target.value)
          }
          placeholder={searchPlaceholder}
          value={effectiveSearchTerm}
        />
        <label className="browser-table-select-group">
          <select
            className="filter-input browser-table-select"
            aria-label={filterLabel}
            onChange={(event) =>
              remotePagination
                ? remotePagination.onFilterChange(event.target.value)
                : setActiveFilter(event.target.value)
            }
            value={effectiveActiveFilter}
          >
            <option value="all">All</option>
            {filterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="browser-table-select-group">
          <select
            className="filter-input browser-table-select"
            aria-label="Page Size"
            onChange={(event) =>
              remotePagination
                ? remotePagination.onPageSizeChange(Number(event.target.value))
                : setPageSize(Number(event.target.value))
            }
            value={String(effectivePageSize)}
          >
            <option value="8">8</option>
            <option value="16">16</option>
            <option value="32">32</option>
          </select>
        </label>
      </div>
      <div className="browser-table">
        <div className="browser-table-header browser-table-row" style={{ gridTemplateColumns: columnTemplate }}>
          {columns.map((column) => {
            const isActiveSort = sortColumnId === column.id;
            return (
              <button
                className={isActiveSort ? "browser-sort-button active" : "browser-sort-button"}
                key={column.id}
                onClick={() => toggleSort(column.id)}
                type="button"
              >
                <span>{column.label}</span>
                <span className="browser-sort-indicator">
                  {isActiveSort ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
                </span>
              </button>
            );
          })}
        </div>
        <div className="browser-table-body browser-table-scroll">
          {pagedRows.length > 0 ? (
            pagedRows.map((row) => {
              const rowKey = getRowKey(row);
              return (
                <div
                  aria-pressed={selectedKey === rowKey}
                  className={selectedKey === rowKey ? "browser-table-row active" : "browser-table-row"}
                  key={rowKey}
                  onClick={() => onSelect(row)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelect(row);
                    }
                  }}
                  role="button"
                  style={{ gridTemplateColumns: columnTemplate }}
                  tabIndex={0}
                >
                  {columns.map((column) => (
                    <span className="browser-table-cell" key={`${rowKey}:${column.id}`}>
                      {column.render(row)}
                    </span>
                  ))}
                </div>
              );
            })
          ) : (
            <p className="list-empty">{emptyMessage}</p>
          )}
        </div>
      </div>
      <div className="browser-table-pagination">
        <span>
          {totalRows === 0
            ? "0 results"
            : `${(effectivePage - 1) * effectivePageSize + 1}-${Math.min(effectivePage * effectivePageSize, totalRows)} of ${totalRows}`}
        </span>
        <div className="browser-table-pagination-actions">
          <button
            className="starter-chip"
            disabled={effectivePage <= 1}
            onClick={() =>
              remotePagination
                ? remotePagination.onPageChange(Math.max(1, effectivePage - 1))
                : setPage((current) => Math.max(1, current - 1))
            }
            type="button"
          >
            Previous
          </button>
          <span className="thread-flag">
            Page {effectivePage} / {totalPages}
          </span>
          <button
            className="starter-chip"
            disabled={effectivePage >= totalPages}
            onClick={() =>
              remotePagination
                ? remotePagination.onPageChange(Math.min(totalPages, effectivePage + 1))
                : setPage((current) => Math.min(totalPages, current + 1))
            }
            type="button"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
