import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import FinalBuildCardStrip from '../src/features/builds/FinalBuildCardStrip';

describe('FinalBuildCardStrip', () => {
  test('uses a fixed ten-slot grid with equal-height card images', () => {
    const { rerender } = render(
      <FinalBuildCardStrip
        cards={[
          {
            id: 'card-large',
            name: 'Three Slot',
            imageUrl: 'https://img.example/large.png',
            cardSize: 'large',
            slotSize: 3,
          },
          {
            id: 'card-medium',
            name: 'Two Slot',
            imageUrl: 'https://img.example/medium.png',
            cardSize: 'medium',
            slotSize: 2,
          },
          {
            id: 'card-small',
            name: 'One Slot',
            imageUrl: 'https://img.example/small.png',
            cardSize: 'small',
            slotSize: 1,
          },
        ]}
      />
    );

    const strip = screen.getByTestId('final-build-card-strip') as HTMLElement;
    const threeSlot = screen.getByTitle('Three Slot') as HTMLElement;
    const twoSlot = screen.getByTitle('Two Slot') as HTMLElement;
    const oneSlot = screen.getByTitle('One Slot') as HTMLElement;
    const threeSlotImage = screen.getByRole('img', { name: 'Three Slot' });
    const twoSlotImage = screen.getByRole('img', { name: 'Two Slot' });
    const oneSlotImage = screen.getByRole('img', { name: 'One Slot' });

    expect(strip.className).toContain('grid');
    expect(strip.style.gridTemplateColumns).toBe('repeat(10, 22px)');
    expect(strip.style.columnGap).toBe('0px');
    expect(threeSlot.style.gridColumn).toBe('span 3 / span 3');
    expect(twoSlot.style.gridColumn).toBe('span 2 / span 2');
    expect(oneSlot.style.gridColumn).toBe('span 1 / span 1');
    expect(threeSlotImage.className).toContain('w-full');
    expect(twoSlotImage.className).toContain('w-full');
    expect(oneSlotImage.className).toContain('w-full');
    expect(threeSlotImage.className).toContain('h-11');
    expect(twoSlotImage.className).toContain('h-11');
    expect(oneSlotImage.className).toContain('h-11');
    expect(threeSlotImage.className).not.toContain('aspect-');
    expect(twoSlotImage.className).not.toContain('aspect-');
    expect(oneSlotImage.className).not.toContain('aspect-');

    rerender(
      <FinalBuildCardStrip
        cards={[
          {
            id: 'card-a',
            name: 'A',
            imageUrl: 'https://img.example/a.png',
            cardSize: 'medium',
            slotSize: 2,
          },
          {
            id: 'card-b',
            name: 'B',
            imageUrl: 'https://img.example/b.png',
            cardSize: 'medium',
            slotSize: 2,
          },
        ]}
      />
    );

    expect(
      (screen.getByTestId('final-build-card-strip') as HTMLElement).style.gridTemplateColumns
    ).toBe('repeat(10, 22px)');
  });

  test('keeps socket-positioned cards inside the ten-slot grid', () => {
    render(
      <FinalBuildCardStrip
        cards={[
          {
            id: 'card-large',
            name: 'Late Large',
            imageUrl: 'https://img.example/late-large.png',
            cardSize: 'large',
            socket: 9,
            slotSize: 3,
          },
        ]}
      />
    );

    expect((screen.getByTitle('Late Large') as HTMLElement).style.gridColumn).toBe(
      '8 / span 3'
    );
  });
});
