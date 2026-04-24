import CardThumb from './CardThumb';

type FinalBuildCard = {
  id: string;
  name: string;
  imageUrl?: string;
  cardSize?: 'small' | 'medium' | 'large';
};

type FinalBuildCardStripProps = {
  cards: FinalBuildCard[];
  title?: string;
};

export default function FinalBuildCardStrip({
  cards,
  title,
}: FinalBuildCardStripProps) {
  const visibleCards = cards.slice(0, 5);

  return (
    <div
      data-testid="final-build-card-strip"
      title={title}
      className="w-[330px] flex items-end justify-center overflow-visible"
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
              size="sm"
              compact
            />
          </div>
        ))}
      </div>
    </div>
  );
}
