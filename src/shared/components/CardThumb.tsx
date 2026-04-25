import { useEffect, useState } from 'react';

type CardSize = 'small' | 'medium' | 'large';

type CardThumbProps = {
  templateId: string;
  name: string;
  imageUrl?: string;
  cardSize?: CardSize;
  compact?: boolean;
  fillWidth?: boolean;
  size?: 'sm' | 'md';
};

const SLOT_CLASSES: Record<NonNullable<CardThumbProps['size']>, string> = {
  sm: 'h-12 w-14',
  md: 'h-16 w-20',
};

const SIZE_CLASSES: Record<NonNullable<CardThumbProps['size']>, Record<CardSize, string>> = {
  sm: {
    small: 'h-11 w-[22px]',
    medium: 'h-11 w-11',
    large: 'h-11 w-[66px]',
  },
  md: {
    small: 'h-14 w-7',
    medium: 'h-14 w-14',
    large: 'h-14 w-[84px]',
  },
};

const FILL_WIDTH_SIZE_CLASSES: Record<NonNullable<CardThumbProps['size']>, string> = {
  sm: 'h-11 min-w-0 w-full',
  md: 'h-14 min-w-0 w-full',
};

function getImageSrc(templateId: string, imageUrl?: string): string | undefined {
  if (!imageUrl) {
    return undefined;
  }

  return imageUrl;
}

export default function CardThumb({
  templateId,
  name,
  imageUrl,
  cardSize = 'medium',
  compact = false,
  fillWidth = false,
  size = 'md',
}: CardThumbProps) {
  const [isHydrated, setIsHydrated] = useState(false);
  const slotClass = SLOT_CLASSES[size];
  const sizeClass = fillWidth ? FILL_WIDTH_SIZE_CLASSES[size] : SIZE_CLASSES[size][cardSize];
  const src = getImageSrc(templateId, imageUrl);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const content = src && isHydrated ? (
    <img
      src={src}
      alt={name}
      data-template-id={templateId}
      className={`${sizeClass} rounded-[6px] border border-[color:rgba(212,162,76,0.38)] object-fill shadow-[0_6px_16px_rgba(0,0,0,0.35)]`}
      loading="lazy"
      referrerPolicy="no-referrer"
    />
  ) : (
    <div
      aria-label={`${name} placeholder`}
      data-template-id={templateId}
      className={`${sizeClass} flex items-center justify-center rounded-[6px] border border-dashed border-[color:rgba(212,162,76,0.42)] bg-[color:rgba(15,13,10,0.7)] text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-text-muted)]`}
    >
      {name.slice(0, 1)}
    </div>
  );

  if (compact) {
    return (
      <div
        className={`relative flex items-center justify-center ${
          fillWidth ? 'min-w-0 w-full' : ''
        }`}
      >
        {content}
      </div>
    );
  }

  return (
    <div className={`${slotClass} relative flex items-center justify-center`}>
      {content}
    </div>
  );
}
