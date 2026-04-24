import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import CardThumb from '../src/components/CardThumb';

describe('CardThumb', () => {
  test('renders the image with a no-referrer policy when image_url exists', () => {
    render(
      <CardThumb
        templateId="card-stove"
        name="Stove"
        imageUrl="https://img.example/stove.png"
      />
    );

    expect(screen.getByRole('img', { name: 'Stove' })).toHaveAttribute(
      'src',
      'https://img.example/stove.png'
    );
    expect(screen.getByRole('img', { name: 'Stove' })).toHaveAttribute(
      'referrerpolicy',
      'no-referrer'
    );
    const image = screen.getByRole('img', { name: 'Stove' });
    const slot = image.parentElement;

    expect(slot?.className).toContain('justify-center');
    expect(slot?.className).toContain('w-20');
    expect(slot?.className).toContain('h-16');
    expect(image.className).toContain('rounded-[6px]');
    expect(image.className).toContain(
      'border-[color:rgba(212,162,76,0.38)]'
    );
    expect(image.className).toContain('object-fill');
  });

  test('uses aspect classes based on the card size metadata', () => {
    const { rerender } = render(
      <CardThumb
        templateId="card-small"
        name="Small Card"
        imageUrl="https://img.example/small.png"
        cardSize="small"
      />
    );

    let image = screen.getByRole('img', { name: 'Small Card' });
    let slot = image.parentElement;

    expect(slot?.className).toContain('w-20');
    expect(image.className).toContain('w-7');
    expect(image.className).toContain('h-14');

    rerender(
      <CardThumb
        templateId="card-medium"
        name="Medium Card"
        imageUrl="https://img.example/medium.png"
        cardSize="medium"
      />
    );

    image = screen.getByRole('img', { name: 'Medium Card' });
    expect(image.className).toContain('w-14');
    expect(image.className).toContain('h-14');

    rerender(
      <CardThumb
        templateId="card-large"
        name="Large Card"
        imageUrl="https://img.example/large.png"
        cardSize="large"
      />
    );

    image = screen.getByRole('img', { name: 'Large Card' });
    expect(image.className).toContain('w-[84px]');
    expect(image.className).toContain('h-14');
  });

  test('stretches the card image to fill the size slot', () => {
    render(
      <CardThumb
        templateId="card-small"
        name="Small Card"
        imageUrl="https://img.example/small.png"
        cardSize="small"
      />
    );

    const image = screen.getByRole('img', { name: 'Small Card' });

    expect(image.className).toContain('object-fill');
    expect(image.className).not.toContain('object-contain');
  });

  test('renders a placeholder when image_url is missing', () => {
    render(<CardThumb templateId="card-stove" name="Stove" />);

    const placeholder = screen.getByLabelText('Stove placeholder');
    const slot = placeholder.parentElement;

    expect(placeholder).toBeInTheDocument();
    expect(slot?.className).toContain('justify-center');
    expect(placeholder.className).toContain('rounded-[6px]');
  });
});
