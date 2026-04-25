import CardThumb from './CardThumb';

type CardThumbGroupItem = {
  id: string;
  name: string;
  imageUrl?: string;
  cardSize?: 'small' | 'medium' | 'large';
};

type CardThumbGroupProps = {
  cards: CardThumbGroupItem[];
  size?: 'sm' | 'md';
  title?: string;
};

const CONTAINER_WIDTH_CLASSES: Record<NonNullable<CardThumbGroupProps['size']>, string> = {
  sm: 'w-[198px]',
  md: 'w-[252px]',
};

export default function CardThumbGroup({
  cards,
  size = 'md',
  title,
}: CardThumbGroupProps) {
  const visibleCards = cards.slice(0, 3);

  return (
    <div
      data-testid="card-thumb-group"
      title={title}
      className={`${CONTAINER_WIDTH_CLASSES[size]} flex items-end justify-center overflow-visible`}
    >
      <div className="inline-flex items-end justify-center gap-0 overflow-visible">
        {visibleCards.map((card) => (
          <div
            key={card.id}
            className="relative flex shrink-0 items-end justify-center overflow-visible"
          >
            <CardThumb
              templateId={card.id}
              name={card.name}
              imageUrl={card.imageUrl}
              cardSize={card.cardSize}
              size={size}
              compact
            />
          </div>
        ))}
      </div>
    </div>
  );
}
