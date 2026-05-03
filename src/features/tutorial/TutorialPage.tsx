import InfoPageShell from '../../shared/components/InfoPageShell';
import { buildLocalizedHref } from '../../shared/lib/dashboard';
import type { Locale } from '../../shared/lib/metrics';
import { getSiteCopy, type TutorialPageCopy } from '../../content/site-copy';

type TutorialPageProps = {
  locale: Locale;
};

function FeatureCard({
  feature,
  index,
}: {
  feature: TutorialPageCopy['features'][number];
  index: number;
}) {
  return (
    <article className="surface flex flex-col gap-4 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <h3 className="font-display text-[1.35rem] font-semibold leading-tight text-[color:var(--color-text-base)]">
          {feature.title}
        </h3>
        <span className="tnum shrink-0 text-sm text-[color:var(--color-accent-bright)]">
          {String(index + 1).padStart(2, '0')}
        </span>
      </div>
      <p className="whitespace-pre-line text-sm leading-6 text-[color:var(--color-text-muted)]">
        {feature.description}
      </p>
      {feature.details.length > 0 ? (
        <ul className="flex flex-col gap-2.5 border-t border-[color:var(--color-border-soft)] pt-4 text-sm leading-6 text-[color:var(--color-text-muted)]">
          {feature.details.map((detail) => (
            <li key={detail} className="flex gap-3">
              <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--color-accent)]" />
              <span>{detail}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

function InstallationGuide({ copy }: { copy: TutorialPageCopy['installation'] }) {
  return (
    <section className="grid gap-5">
      <header className="grid gap-3">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-[color:var(--color-text-base)]">
          {copy.heading}
        </h2>
      </header>

      <ol className="grid gap-4">
        {copy.steps.map((step, index) => (
          <li
            key={step.title}
            className="surface-flat grid gap-3 px-5 py-5 sm:grid-cols-[3.5rem_minmax(0,1fr)] sm:gap-5"
          >
            <span className="tnum text-xl font-semibold text-[color:var(--color-accent-bright)]">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="grid gap-2">
              <span className="font-display text-xl font-semibold tracking-tight text-[color:var(--color-text-base)]">
                {step.title}
              </span>
              <span className="text-sm leading-7 text-[color:var(--color-text-muted)]">
                {step.description}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

type HotkeyItem = TutorialPageCopy['quickStart']['groups'][number]['items'][number];

const quickStartHeaderPlacement = [
  'xl:col-start-1 xl:col-span-2 xl:row-start-1',
  'xl:col-start-3 xl:col-span-2 xl:row-start-1',
];

const quickStartCardPlacement = [
  ['xl:col-start-1 xl:row-start-2', 'xl:col-start-2 xl:row-start-2'],
  ['xl:col-start-3 xl:row-start-2', 'xl:col-start-4 xl:row-start-2'],
];

function HotkeyCard({ item, className = '' }: { item: HotkeyItem; className?: string }) {
  const hasBindingActions = item.bindings.some((binding) => binding.action);
  const primaryBinding = item.bindings[0];
  const secondaryBindings = hasBindingActions ? item.bindings.slice(1) : [];

  return (
    <article className={`surface-flat flex min-h-40 min-w-0 flex-col justify-between gap-5 overflow-hidden p-5 ${className}`}>
      {hasBindingActions && primaryBinding ? (
        <span className="flex max-w-full items-center gap-2">
          <span className="tnum inline-flex min-h-11 max-w-full items-center justify-center whitespace-nowrap rounded-xl border border-[color:var(--color-border-strong)] bg-[linear-gradient(180deg,rgba(232,185,74,0.18),rgba(232,185,74,0.06))] px-3 py-2 text-center text-xs font-semibold leading-tight text-[color:var(--color-accent-bright)] shadow-[inset_0_-2px_0_rgba(0,0,0,0.26),0_12px_28px_-18px_rgba(232,185,74,0.6)]">
            {primaryBinding.key}
          </span>
          {primaryBinding.action ? (
            <span className="min-w-0 text-xs font-medium leading-tight text-[color:var(--color-text-muted)]">
              {primaryBinding.action}
            </span>
          ) : null}
        </span>
      ) : (
        <span className="flex max-w-full flex-wrap gap-2">
          {item.bindings.map((binding) => (
            <span
              key={binding.key}
              className="tnum inline-flex min-h-11 max-w-full items-center justify-center whitespace-nowrap rounded-xl border border-[color:var(--color-border-strong)] bg-[linear-gradient(180deg,rgba(232,185,74,0.18),rgba(232,185,74,0.06))] px-3 py-2 text-center text-xs font-semibold leading-tight text-[color:var(--color-accent-bright)] shadow-[inset_0_-2px_0_rgba(0,0,0,0.26),0_12px_28px_-18px_rgba(232,185,74,0.6)]"
            >
              {binding.key}
            </span>
          ))}
        </span>
      )}
      <span className="grid min-w-0 gap-2">
        <span className="font-display text-lg font-semibold leading-tight text-[color:var(--color-text-base)]">
          {item.title}
        </span>
        <span className="whitespace-pre-line break-words text-sm leading-6 text-[color:var(--color-text-muted)]">
          {item.description}
        </span>
        {secondaryBindings.length > 0 ? (
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 pt-0.5 text-[0.66rem] font-medium leading-tight text-[color:var(--color-text-faint)]">
            {secondaryBindings.map((binding, index) => (
              <span key={binding.key} className="inline-flex min-w-0 items-center gap-1">
                {index > 0 ? (
                  <span aria-hidden="true" className="text-[color:var(--color-border-strong)]">
                    ·
                  </span>
                ) : null}
                <span className="tnum whitespace-nowrap text-[color:var(--color-accent-bright)]">
                  {binding.key}
                </span>
                <span className="whitespace-nowrap">{binding.action}</span>
              </span>
            ))}
          </span>
        ) : null}
      </span>
    </article>
  );
}

function QuickStart({ copy }: { copy: TutorialPageCopy['quickStart'] }) {
  return (
    <section className="grid gap-5">
      <header className="grid gap-3">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-[color:var(--color-text-base)]">
          {copy.heading}
        </h2>
      </header>
      <div className="grid gap-8 xl:grid-cols-4 xl:items-stretch xl:gap-5">
        {copy.groups.map((group, groupIndex) => (
          <section key={group.title} className="grid min-w-0 content-start gap-4 xl:contents">
            <header className={`grid gap-2 border-l border-[color:var(--color-accent)] pl-4 ${quickStartHeaderPlacement[groupIndex] ?? ''}`}>
              <p className="font-display text-xl font-semibold leading-tight text-[color:var(--color-text-base)]">
                {group.title}
              </p>
              <p className="text-sm leading-6 text-[color:var(--color-text-muted)]">
                {group.description}
              </p>
              {group.note ? (
                <p className="mt-1 min-w-0 break-words rounded-xl border border-[color:var(--color-border-soft)] bg-[rgba(232,185,74,0.04)] px-4 py-3 text-xs leading-5 text-[color:var(--color-text-faint)]">
                  {group.note}
                </p>
              ) : null}
            </header>
            <div className="grid items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:contents">
              {group.items.map((item, itemIndex) => (
                <HotkeyCard
                  key={item.title}
                  item={item}
                  className={quickStartCardPlacement[groupIndex]?.[itemIndex] ?? ''}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

export default function TutorialPage({ locale }: TutorialPageProps) {
  const copy = getSiteCopy(locale).tutorial;

  return (
    <InfoPageShell
      activeSection="tutorial"
      locale={locale}
      eyebrow={copy.eyebrow}
      title={copy.title}
    >
      <section className="surface overflow-hidden p-6 sm:p-8">
        <div className="grid gap-7 md:grid-cols-[7rem_minmax(0,1fr)] md:items-center">
          <img
            src="/bazaarplusplus-icon.webp"
            alt=""
            aria-hidden="true"
            className="h-24 w-24 object-contain drop-shadow-[0_0_28px_rgba(232,185,74,0.38)]"
            decoding="async"
          />
          <div className="flex flex-wrap gap-3">
            <a
              href={buildLocalizedHref('/download', { lang: locale })}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[color:var(--color-accent)] px-5 py-3 text-sm font-medium tracking-[0.04em] text-[#1a1306] shadow-[0_18px_36px_-12px_rgba(232,185,74,0.5)] transition hover:bg-[color:var(--color-accent-bright)]"
            >
              <span>{copy.primaryActionLabel}</span>
              <span aria-hidden="true">→</span>
            </a>
            <a
              href={buildLocalizedHref('/support', { lang: locale })}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[color:var(--color-accent)] px-5 py-3 text-sm font-medium tracking-[0.04em] text-[color:var(--color-accent-bright)] transition hover:bg-[color:var(--color-accent)] hover:text-[#1a1306]"
            >
              <span>{copy.secondaryActionLabel}</span>
              <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </section>

      <section className="grid gap-6">
        <header className="grid gap-3">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-[color:var(--color-text-base)]">
            {copy.featureHeading}
          </h2>
        </header>
        <div className="grid gap-4 md:grid-cols-2">
          {copy.features.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>
      </section>

      <InstallationGuide copy={copy.installation} />
      <QuickStart copy={copy.quickStart} />
    </InfoPageShell>
  );
}
