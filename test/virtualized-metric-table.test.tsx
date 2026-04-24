import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import VirtualizedMetricTable from '../src/components/VirtualizedMetricTable';

describe('VirtualizedMetricTable', () => {
  test('renders only the visible window of rows and swaps them on scroll', () => {
    const rows = Array.from({ length: 200 }, (_, index) => ({
      id: `row-${index + 1}`,
      label: `Row ${index + 1}`,
    }));

    render(
      <VirtualizedMetricTable
        ariaLabel="Test table"
        columns={
          <tr>
            <th className="px-4 py-3">Label</th>
          </tr>
        }
        rows={rows}
        rowHeight={40}
        viewportHeight={160}
        overscan={1}
        columnCount={1}
        getRowKey={(row) => row.id}
        renderRow={(row) => (
          <tr className="metric-row">
            <td className="px-4 py-3">{row.label}</td>
          </tr>
        )}
      />
    );

    expect(screen.getByText('Row 1')).toBeInTheDocument();
    expect(screen.queryByText('Row 30')).not.toBeInTheDocument();
    expect(document.querySelectorAll('tbody .metric-row').length).toBeLessThan(12);

    const scroller = screen.getByTestId('virtualized-table-scroll');
    Object.defineProperty(scroller, 'scrollTop', {
      configurable: true,
      value: 1160,
      writable: true,
    });

    fireEvent.scroll(scroller);

    expect(screen.getByText('Row 30')).toBeInTheDocument();
    expect(screen.queryByText('Row 1')).not.toBeInTheDocument();
    expect(document.querySelectorAll('tbody .metric-row').length).toBeLessThan(12);
  });
});
