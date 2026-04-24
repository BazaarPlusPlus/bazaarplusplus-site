import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import CardThumbGroup from '../src/components/CardThumbGroup';

describe('CardThumbGroup', () => {
  test('renders a packed archetype card cluster centered inside a nine-unit container', () => {
    render(
      <CardThumbGroup
        size="md"
        cards={[
          {
            id: 'card-a',
            name: 'Amber Core',
            imageUrl: 'https://img.example/amber-core.png',
            cardSize: 'medium',
          },
          {
            id: 'card-b',
            name: 'Eagle Talisman',
            imageUrl: 'https://img.example/eagle-talisman.png',
            cardSize: 'small',
          },
          {
            id: 'card-c',
            name: 'Chronobarrier',
            imageUrl: 'https://img.example/chronobarrier.png',
            cardSize: 'large',
          },
        ]}
      />
    );

    const group = screen.getByTestId('card-thumb-group');
    const cluster = group.firstElementChild as HTMLElement;
    const firstImage = screen.getByRole('img', { name: 'Amber Core' });
    const firstSlot = cluster.children[0] as HTMLElement;
    const secondSlot = cluster.children[1] as HTMLElement;
    const thirdSlot = cluster.children[2] as HTMLElement;
    const secondImage = screen.getByRole('img', { name: 'Eagle Talisman' });
    const thirdImage = screen.getByRole('img', { name: 'Chronobarrier' });

    expect(group.className).toContain('w-[252px]');
    expect(group.className).toContain('justify-center');
    expect(cluster.className).toContain('inline-flex');
    expect(cluster.className).toContain('gap-0');
    expect(firstImage.parentElement?.className).not.toContain('w-20');
    expect(firstSlot.className).not.toMatch(/\bcol-span-\d+/);
    expect(secondSlot.className).not.toMatch(/\bcol-span-\d+/);
    expect(thirdSlot.className).not.toMatch(/\bcol-span-\d+/);
    expect(firstImage.className).toContain('w-14');
    expect(secondImage.className).toContain('w-7');
    expect(thirdImage.className).toContain('w-[84px]');
  });
});
