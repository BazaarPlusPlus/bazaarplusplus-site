import { Fragment, type ReactNode, useEffect, useRef, useState } from 'react';

type VirtualizedMetricTableProps<T> = {
  ariaLabel: string;
  columns: ReactNode;
  rows: T[];
  rowHeight: number;
  viewportHeight: number;
  overscan?: number;
  columnCount: number;
  columnWidths?: string[];
  getRowKey: (row: T, index: number) => string;
  renderRow: (row: T, index: number) => ReactNode;
};

export default function VirtualizedMetricTable<T>({
  ariaLabel,
  columns,
  rows,
  rowHeight,
  viewportHeight,
  overscan = 3,
  columnCount,
  columnWidths = [],
  getRowKey,
  renderRow,
}: VirtualizedMetricTableProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const rafRef = useRef<number | undefined>(undefined);
  const visibleRowCount = Math.ceil(viewportHeight / rowHeight) + overscan * 2;
  const maxStartIndex = Math.max(0, rows.length - visibleRowCount);
  const startIndex = Math.min(
    maxStartIndex,
    Math.max(0, Math.floor(scrollTop / rowHeight) - overscan)
  );
  const endIndex = Math.min(rows.length, startIndex + visibleRowCount);
  const topSpacerHeight = startIndex * rowHeight;
  const bottomSpacerHeight = Math.max(0, (rows.length - endIndex) * rowHeight);
  const visibleRows = rows.slice(startIndex, endIndex);

  useEffect(() => () => {
    if (rafRef.current !== undefined) {
      window.cancelAnimationFrame(rafRef.current);
    }
  }, []);

  function handleScroll(nextScrollTop: number) {
    if (rafRef.current !== undefined) {
      window.cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = undefined;
      setScrollTop(nextScrollTop);
    });
  }

  return (
    <div
      data-testid="virtualized-table-scroll"
      className="max-h-[68rem] overflow-auto"
      style={{ height: `${viewportHeight}px` }}
      onScroll={(event) => handleScroll(event.currentTarget.scrollTop)}
    >
      <table aria-label={ariaLabel} className="min-w-full table-fixed border-collapse">
        {columnWidths.length > 0 ? (
          <colgroup>
            {columnWidths.map((width, index) => (
              <col key={`${index}:${width}`} style={{ width }} />
            ))}
          </colgroup>
        ) : null}
        <thead className="sticky top-0 z-10 bg-[linear-gradient(180deg,rgba(26,21,16,0.96),rgba(20,16,11,0.96))] text-left font-display-italic text-[0.72rem] uppercase tracking-[0.2em] text-[color:var(--color-text-muted)] shadow-[0_1px_0_var(--color-border-soft)] backdrop-blur">
          {columns}
        </thead>
        <tbody>
          {topSpacerHeight > 0 ? (
            <tr aria-hidden="true">
              <td colSpan={columnCount} className="p-0" style={{ height: `${topSpacerHeight}px` }} />
            </tr>
          ) : null}
          {visibleRows.map((row, index) => (
            <Fragment key={getRowKey(row, startIndex + index)}>
              {renderRow(row, startIndex + index)}
            </Fragment>
          ))}
          {bottomSpacerHeight > 0 ? (
            <tr aria-hidden="true">
              <td
                colSpan={columnCount}
                className="p-0"
                style={{ height: `${bottomSpacerHeight}px` }}
              />
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
