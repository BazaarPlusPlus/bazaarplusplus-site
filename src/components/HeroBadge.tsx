import { getHeroColor, getHeroShortLabel } from '../lib/heroes';

type HeroBadgeProps = {
  hero: string;
  selected?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const SIZE_CLASSES: Record<NonNullable<HeroBadgeProps['size']>, string> = {
  sm: 'gap-1.5 px-2 py-1 text-xs',
  md: 'gap-2 px-2.5 py-1.5 text-sm',
  lg: 'gap-2.5 px-3 py-1.5 text-base',
};

const DOT_CLASSES: Record<NonNullable<HeroBadgeProps['size']>, string> = {
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
};

export default function HeroBadge({
  hero,
  selected = false,
  size = 'md',
  className = '',
}: HeroBadgeProps) {
  const color = getHeroColor(hero);
  const label = getHeroShortLabel(hero);

  return (
    <span
      data-hero-badge={hero}
      data-hero-short-label={label}
      title={hero}
      className={`inline-flex min-w-0 items-center rounded-full border font-semibold tracking-[0.1em] ${
        SIZE_CLASSES[size]
      } ${
        selected
          ? 'border-[color:var(--color-accent)] bg-[color:rgba(212,162,76,0.2)] text-[color:var(--color-text-base)] shadow-[0_0_0_1px_rgba(212,162,76,0.18)]'
          : 'border-[color:rgba(58,47,31,0.78)] bg-[color:rgba(19,15,8,0.7)] text-[color:var(--color-text-base)]'
      } ${className}`}
    >
      <span
        data-hero-color-dot={hero}
        className={`${DOT_CLASSES[size]} shrink-0 rounded-full`}
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <span aria-hidden="true">{label}</span>
      <span className="sr-only">{hero}</span>
    </span>
  );
}
