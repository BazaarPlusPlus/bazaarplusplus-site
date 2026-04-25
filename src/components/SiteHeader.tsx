import { buildLocalizedHref } from '../lib/dashboard';
import type { Locale, MetricsSource } from '../lib/metrics';
import { getSiteCopy } from '../lib/site-copy';

export type SiteHeaderActiveSection =
  | 'heroes'
  | 'cards'
  | 'builds'
  | 'download'
  | 'support';

type StatsNavItem = {
  key: 'heroes' | 'cards' | 'builds';
  label: string;
  numeral: string;
  href: string;
};

const STATS_NAV_ITEMS: StatsNavItem[] = [
  { key: 'heroes', label: 'Heroes', numeral: 'I', href: '/' },
  { key: 'cards', label: 'Cards', numeral: 'II', href: '/cards' },
  { key: 'builds', label: 'Builds', numeral: 'III', href: '/builds' },
];

type InfoNavItem = {
  key: 'download' | 'support';
  href: string;
  glyph: string;
};

const INFO_NAV_ITEMS: InfoNavItem[] = [
  { key: 'download', href: '/download', glyph: '↓' },
  { key: 'support', href: '/support', glyph: '♥' },
];

type SiteHeaderProps = {
  activeSection: SiteHeaderActiveSection;
  locale: Locale;
  liveFeedSource?: MetricsSource;
};

const LOCALE_OPTIONS: Array<{ code: Locale; label: string }> = [
  { code: 'en', label: 'EN' },
  { code: 'zh', label: '中' },
];

function buildLocaleToggleHref(targetLocale: Locale): string {
  if (typeof window === 'undefined') {
    return '#';
  }

  const url = new URL(window.location.href);
  if (targetLocale === 'en') {
    url.searchParams.delete('lang');
  } else {
    url.searchParams.set('lang', targetLocale);
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

export default function SiteHeader({ activeSection, locale, liveFeedSource }: SiteHeaderProps) {
  const copy = getSiteCopy(locale);

  return (
    <header
      aria-label="BazaarPlusPlus"
      className="sticky top-0 z-30 border-b border-[color:var(--color-border-soft)] bg-[linear-gradient(180deg,rgba(15,12,8,0.96),rgba(10,8,5,0.92))] backdrop-blur-md"
    >
      <div className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-[color:var(--color-accent-glow)] to-transparent" />
      <div className="mx-auto grid w-full max-w-[1440px] items-center gap-4 px-6 py-4 sm:px-10 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <a
          href={buildLocalizedHref('/', { lang: locale })}
          aria-label="BazaarPlusPlus home"
          className="group flex w-fit items-center gap-3"
        >
          <span className="relative flex h-11 w-11 shrink-0 items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(232,185,74,0.32),transparent_72%)] blur-md transition-opacity group-hover:opacity-100" />
            <img
              src="/bazaarplusplus-icon.png"
              alt=""
              className="relative h-11 w-11 object-contain drop-shadow-[0_0_18px_rgba(232,185,74,0.32)]"
            />
          </span>
          <span className="grid leading-none">
            <span className="font-display text-[1.32rem] font-semibold tracking-[-0.01em] text-[color:var(--color-accent-bright)]">
              BazaarPlusPlus
            </span>
          </span>
        </a>

        <nav aria-label="Primary" className="flex min-w-0 items-center justify-center gap-1">
          {STATS_NAV_ITEMS.map((item) => {
            const active = item.key === activeSection;
            return (
              <a
                key={item.key}
                href={buildLocalizedHref(item.href, { lang: locale })}
                aria-current={active ? 'page' : undefined}
                className={`group relative inline-flex items-center gap-2.5 rounded-full px-4 py-2 text-sm font-medium transition ${
                  active
                    ? 'text-[color:var(--color-accent-bright)]'
                    : 'text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text-base)]'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`font-display-italic text-[0.7rem] tracking-[0.18em] transition ${
                    active
                      ? 'text-[color:var(--color-accent)]'
                      : 'text-[color:var(--color-text-faint)] group-hover:text-[color:var(--color-text-muted)]'
                  }`}
                >
                  {item.numeral}
                </span>
                <span className="tracking-[0.06em]">{item.label}</span>
                {active ? (
                  <span className="pointer-events-none absolute inset-x-3 -bottom-[18px] h-[2px] rounded-full bg-[color:var(--color-accent)] shadow-[0_0_14px_rgba(232,185,74,0.55)]" />
                ) : null}
              </a>
            );
          })}
        </nav>

        <div className="flex min-w-0 flex-wrap items-center justify-end gap-x-4 gap-y-2 text-xs text-[color:var(--color-text-muted)]">
          {liveFeedSource ? (
            <span className="inline-flex items-center gap-2 font-medium uppercase tracking-[0.16em]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 animate-ping rounded-full bg-[color:var(--color-pos)] opacity-50" />
                <span className="relative h-2 w-2 rounded-full bg-[color:var(--color-pos)] shadow-[0_0_10px_rgba(109,191,122,0.7)]" />
              </span>
              <span className="text-[color:var(--color-text-base)]">Live feed</span>
            </span>
          ) : null}

          {liveFeedSource ? (
            <span aria-hidden="true" className="hidden h-4 w-px bg-[color:var(--color-border-soft)] sm:block" />
          ) : null}

          <nav aria-label="Secondary" className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {INFO_NAV_ITEMS.map((item) => {
              const active = item.key === activeSection;
              const label = copy.nav[item.key];
              const labelTypography =
                locale === 'zh'
                  ? 'text-[0.84rem] tracking-normal'
                  : 'text-[0.78rem] tracking-[0.08em]';
              return (
                <a
                  key={item.key}
                  href={buildLocalizedHref(item.href, { lang: locale })}
                  aria-current={active ? 'page' : undefined}
                  className={`group relative inline-flex items-center gap-1.5 font-medium transition ${labelTypography} ${
                    active
                      ? 'text-[color:var(--color-accent-bright)]'
                      : 'text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text-base)]'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`text-[0.85em] transition ${
                      active
                        ? 'text-[color:var(--color-accent)]'
                        : 'text-[color:var(--color-text-faint)] group-hover:text-[color:var(--color-text-muted)]'
                    }`}
                  >
                    {item.glyph}
                  </span>
                  <span>{label}</span>
                  {active ? (
                    <span className="pointer-events-none absolute inset-x-0 -bottom-1.5 h-[2px] rounded-full bg-[color:var(--color-accent)] shadow-[0_0_8px_rgba(232,185,74,0.5)]" />
                  ) : null}
                </a>
              );
            })}
          </nav>

          <div
            role="group"
            aria-label="Language"
            className="inline-flex items-center rounded-full border border-[color:var(--color-border-soft)] p-0.5 text-[0.7rem] font-medium tracking-[0.08em]"
          >
            {LOCALE_OPTIONS.map((option) => {
              const active = option.code === locale;
              if (active) {
                return (
                  <span
                    key={option.code}
                    aria-current="true"
                    className="rounded-full bg-[rgba(232,185,74,0.18)] px-2.5 py-0.5 text-[color:var(--color-accent-bright)]"
                  >
                    {option.label}
                  </span>
                );
              }
              return (
                <a
                  key={option.code}
                  href={buildLocaleToggleHref(option.code)}
                  hrefLang={option.code}
                  className="rounded-full px-2.5 py-0.5 text-[color:var(--color-text-muted)] transition hover:text-[color:var(--color-text-base)]"
                >
                  {option.label}
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
}
