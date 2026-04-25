import CardThumb from '../../shared/components/CardThumb';

type FinalBuildCard = {
  id: string;
  name: string;
  imageUrl?: string;
  cardSize?: 'small' | 'medium' | 'large';
  socket?: number;
  slotSize?: number;
};

type FinalBuildCardStripProps = {
  cards: FinalBuildCard[];
  title?: string;
};

const FINAL_BUILD_SLOT_COUNT = 10;
const FINAL_BUILD_SLOT_WIDTH_PX = 22;

const CARD_SIZE_SLOT_SPANS: Record<NonNullable<FinalBuildCard['cardSize']>, number> = {
  small: 1,
  medium: 2,
  large: 3,
};

function clampSlotSpan(value: number): number {
  return Math.min(FINAL_BUILD_SLOT_COUNT, Math.max(1, Math.trunc(value)));
}

function getSlotSpan(card: FinalBuildCard): number {
  if (typeof card.slotSize === 'number' && Number.isFinite(card.slotSize)) {
    return clampSlotSpan(card.slotSize);
  }

  return CARD_SIZE_SLOT_SPANS[card.cardSize ?? 'medium'];
}

function getGridColumn(card: FinalBuildCard): string {
  const span = getSlotSpan(card);

  if (typeof card.socket !== 'number' || !Number.isFinite(card.socket)) {
    return `span ${span} / span ${span}`;
  }

  const lastStart = FINAL_BUILD_SLOT_COUNT - span + 1;
  const start = Math.min(lastStart, Math.max(1, Math.trunc(card.socket) + 1));

  return `${start} / span ${span}`;
}

export default function FinalBuildCardStrip({
  cards,
  title,
}: FinalBuildCardStripProps) {
  const visibleCards = cards.slice(0, FINAL_BUILD_SLOT_COUNT);

  return (
    <div
      data-testid="final-build-card-strip"
      aria-label={title}
      className="grid w-full max-w-[360px] items-end overflow-visible"
      style={{
        gridTemplateColumns: `repeat(${FINAL_BUILD_SLOT_COUNT}, ${FINAL_BUILD_SLOT_WIDTH_PX}px)`,
        columnGap: '0px',
      }}
    >
      {visibleCards.map((card, index) => (
        <div
          key={`${card.id}:${index}`}
          title={card.name}
          className="relative flex min-w-0 items-end justify-center overflow-visible"
          style={{ gridColumn: getGridColumn(card) }}
        >
          <CardThumb
            templateId={card.id}
            name={card.name}
            imageUrl={card.imageUrl}
            cardSize={card.cardSize}
            size="sm"
            compact
            fillWidth
          />
        </div>
      ))}
    </div>
  );
}
