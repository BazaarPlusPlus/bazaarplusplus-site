import type { SortDirection } from '../lib/table-sorting';

type SortableHeaderProps = {
  label: string;
  activeDirection?: SortDirection;
  onToggle: () => void;
  className?: string;
};

export default function SortableHeader({
  label,
  activeDirection,
  onToggle,
  className = '',
}: SortableHeaderProps) {
  const arrow = activeDirection === 'asc' ? '↑' : activeDirection === 'desc' ? '↓' : '↕';

  return (
    <th
      scope="col"
      aria-sort={
        activeDirection === 'asc'
          ? 'ascending'
          : activeDirection === 'desc'
            ? 'descending'
            : 'none'
      }
      className={className}
    >
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex min-w-max items-center gap-1.5 whitespace-nowrap text-inherit transition hover:text-[color:var(--color-text-base)]"
      >
        <span className="whitespace-nowrap">{label}</span>
        <span aria-hidden="true" className="shrink-0 text-[0.9em] text-[color:var(--color-accent-bright)]">
          {arrow}
        </span>
      </button>
    </th>
  );
}
