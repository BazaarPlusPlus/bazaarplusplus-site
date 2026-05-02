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
    <article className="surface flex min-h-72 flex-col gap-5 p-6">
      <div className="flex items-start justify-between gap-4">
        <h3 className="font-display text-[1.35rem] font-semibold leading-tight text-[color:var(--color-text-base)]">
          {feature.title}
        </h3>
        <span className="tnum shrink-0 text-sm text-[color:var(--color-accent-bright)]">
          {String(index + 1).padStart(2, '0')}
        </span>
      </div>
      <p className="text-sm leading-7 text-[color:var(--color-text-muted)]">
        {feature.description}
      </p>
      <ul className="mt-auto flex flex-col gap-3 border-t border-[color:var(--color-border-soft)] pt-5 text-sm leading-6 text-[color:var(--color-text-muted)]">
        {feature.details.map((detail) => (
          <li key={detail} className="flex gap-3">
            <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--color-accent)]" />
            <span>{detail}</span>
          </li>
        ))}
      </ul>
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
        <p className="max-w-2xl text-sm leading-7 text-[color:var(--color-text-muted)]">
          {copy.intro}
        </p>
        <ul className="mt-2 grid max-w-2xl gap-3 text-sm leading-6 text-[color:var(--color-text-muted)]">
          {copy.requirements.map((requirement) => (
            <li key={requirement} className="flex gap-3">
              <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--color-cool)]" />
              <span>{requirement}</span>
            </li>
          ))}
        </ul>
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

function QuickStart({ copy }: { copy: TutorialPageCopy['quickStart'] }) {
  return (
    <section className="grid gap-5">
      <h2 className="font-display text-3xl font-semibold tracking-tight text-[color:var(--color-text-base)]">
        {copy.heading}
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        {copy.items.map((item) => (
          <article key={item.label} className="surface-flat grid grid-cols-[4.5rem_minmax(0,1fr)] gap-4 p-5">
            <span className="tnum flex h-12 items-center justify-center rounded-full border border-[color:var(--color-border-soft)] text-sm font-semibold text-[color:var(--color-accent-bright)]">
              {item.label}
            </span>
            <p className="self-center text-sm leading-6 text-[color:var(--color-text-muted)]">
              {item.value}
            </p>
          </article>
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
      intro={copy.intro}
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
          <p className="max-w-2xl text-sm leading-7 text-[color:var(--color-text-muted)]">
            {copy.featureIntro}
          </p>
        </header>
        <div className="grid gap-5 md:grid-cols-2">
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
