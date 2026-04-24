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
        className="inline-flex items-center gap-2 text-inherit transition hover:text-[color:var(--color-text-base)]"
      >
        <span>{label}</span>
        <span aria-hidden="true" className="text-[0.9em] text-[color:var(--color-accent-bright)]">
          {arrow}
        </span>
      </button>
    </th>
  );
}
