import type { ReactNode } from 'react';

import type { SortDirection } from '../lib/table-sorting';

type SortableHeaderProps = {
  label: string;
  activeDirection?: SortDirection;
  onToggle: () => void;
  className?: string;
  // Rendered after the sort button as a separate focus target (never nested inside it).
  info?: ReactNode;
};

export default function SortableHeader({
  label,
  activeDirection,
  onToggle,
  className = '',
  info,
}: SortableHeaderProps) {
  const isAsc = activeDirection === 'asc';
  const isDesc = activeDirection === 'desc';
  const isActive = isAsc || isDesc;

  return (
    <th
      scope="col"
      aria-sort={isAsc ? 'ascending' : isDesc ? 'descending' : 'none'}
      className={className}
    >
      <span className="inline-flex min-w-max items-center gap-1.5">
      <button
        type="button"
        onClick={onToggle}
        className={`group inline-flex min-w-max items-center gap-1.5 whitespace-nowrap text-left transition ${
          isActive
            ? 'text-[color:var(--color-accent-bright)]'
            : 'text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text-base)]'
        }`}
      >
        <span className="whitespace-nowrap">{label}</span>
        <span
          aria-hidden="true"
          className={`flex flex-col leading-[0.6] text-[0.6rem] transition ${
            isActive ? 'text-[color:var(--color-accent)]' : 'text-[color:var(--color-text-faint)]'
          }`}
        >
          <span
            className={`transition ${
              isAsc ? 'opacity-100 text-[color:var(--color-accent-bright)]' : isDesc ? 'opacity-30' : 'opacity-50'
            }`}
          >
            ▲
          </span>
          <span
            className={`transition ${
              isDesc ? 'opacity-100 text-[color:var(--color-accent-bright)]' : isAsc ? 'opacity-30' : 'opacity-50'
            }`}
          >
            ▼
          </span>
        </span>
      </button>
      {info}
      </span>
    </th>
  );
}
