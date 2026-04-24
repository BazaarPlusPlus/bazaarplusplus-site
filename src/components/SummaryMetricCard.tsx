import type { ReactNode } from 'react';

type SummaryMetricCardProps = {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  breakValue?: boolean;
};

export default function SummaryMetricCard({
  label,
  value,
  detail,
  breakValue = false,
}: SummaryMetricCardProps) {
  return (
    <article className="rounded-[20px] border border-[color:rgba(212,162,76,0.18)] bg-[color:rgba(15,13,10,0.55)] px-5 py-4">
      <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--color-text-muted)]">
        {label}
      </p>
      <div
        className={`mt-3 text-2xl text-[color:var(--color-text-base)] ${
          breakValue ? 'break-all' : ''
        }`}
      >
        {value}
      </div>
      {detail ? (
        <p className="mt-2 text-sm text-[color:var(--color-text-muted)]">{detail}</p>
      ) : null}
    </article>
  );
}
