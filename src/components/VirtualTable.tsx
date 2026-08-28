import { useMemo, useRef, useState, type CSSProperties } from "react";
import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable, type ColumnDef, type SortingState } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";

interface VirtualTableProps<T> {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  height?: number;
  estimateRowHeight?: number;
  onSelect?: (record: T) => void;
  selectedId?: string | null;
  getRowId?: (record: T) => string;
  emptyMessage?: string;
  ariaLabel: string;
}

export function VirtualTable<T>({
  data,
  columns,
  height = 520,
  estimateRowHeight = 39,
  onSelect,
  selectedId,
  getRowId = (record) => String((record as { id?: string }).id ?? ""),
  emptyMessage = "No records match the current filters.",
  ariaLabel,
}: VirtualTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const tableColumns = useMemo(() => columns, [columns]);
  const table = useReactTable({
    data,
    columns: tableColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId,
  });
  const rows = table.getRowModel().rows;
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateRowHeight,
    overscan: 8,
  });

  if (!rows.length) return <div className="empty-state">{emptyMessage}</div>;

  return (
    <div className="virtual-table" role="table" aria-label={ariaLabel} style={{ "--table-height": `${height}px` } as CSSProperties}>
      <div className="virtual-table-head" role="rowgroup">
        {table.getHeaderGroups().map((headerGroup) => <div role="row" className="virtual-row header-row" key={headerGroup.id}>
          {headerGroup.headers.map((header, index) => <div
            role="columnheader"
            key={header.id}
            className={index === 0 ? "pinned-cell" : ""}
            style={{ width: header.getSize(), minWidth: header.getSize(), maxWidth: header.getSize() }}
            aria-sort={header.column.getIsSorted() === "asc" ? "ascending" : header.column.getIsSorted() === "desc" ? "descending" : "none"}
          >
            <button type="button" onClick={header.column.getToggleSortingHandler()} disabled={!header.column.getCanSort()}>
              {flexRender(header.column.columnDef.header, header.getContext())}
              {header.column.getIsSorted() === "asc" ? " ↑" : header.column.getIsSorted() === "desc" ? " ↓" : ""}
            </button>
          </div>)}
        </div>)}
      </div>
      <div ref={scrollRef} className="virtual-table-scroll" role="rowgroup">
        <div className="virtual-table-spacer" style={{ height: virtualizer.getTotalSize() }}>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index];
            const id = getRowId(row.original);
            return <div
              role="row"
              aria-selected={selectedId === id}
              tabIndex={0}
              className={`virtual-row data-row${selectedId === id ? " selected" : ""}`}
              key={row.id}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{ transform: `translateY(${virtualRow.start}px)` }}
              onClick={() => onSelect?.(row.original)}
              onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect?.(row.original); } }}
            >
              {row.getVisibleCells().map((cell, index) => <div
                role="cell"
                key={cell.id}
                className={index === 0 ? "pinned-cell" : ""}
                style={{ width: cell.column.getSize(), minWidth: cell.column.getSize(), maxWidth: cell.column.getSize() }}
              >{flexRender(cell.column.columnDef.cell, cell.getContext())}</div>)}
            </div>;
          })}
        </div>
      </div>
    </div>
  );
}
