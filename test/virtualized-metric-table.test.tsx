import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import VirtualizedMetricTable from '../src/shared/components/VirtualizedMetricTable';

describe('VirtualizedMetricTable', () => {
  test('renders only the visible window of rows and swaps them on scroll', async () => {
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
        columnWidths={['12rem']}
        getRowKey={(row) => row.id}
        renderRow={(row) => (
          <tr className="metric-row">
            <td className="px-4 py-3">{row.label}</td>
          </tr>
        )}
      />
    );

    expect(screen.getByText('Row 1')).toBeInTheDocument();
    const table = screen.getByRole('table', { name: 'Test table' });
    expect(table.className).toContain('table-fixed');
    expect(table.querySelector('col')?.getAttribute('style')).toContain('width: 12rem');
    expect(screen.queryByText('Row 30')).not.toBeInTheDocument();
    expect(document.querySelectorAll('tbody .metric-row').length).toBeLessThan(12);

    const scroller = screen.getByTestId('virtualized-table-scroll');
    Object.defineProperty(scroller, 'scrollTop', {
      configurable: true,
      value: 1160,
      writable: true,
    });

    fireEvent.scroll(scroller);

    expect(await screen.findByText('Row 30')).toBeInTheDocument();
    expect(screen.queryByText('Row 1')).not.toBeInTheDocument();
    expect(document.querySelectorAll('tbody .metric-row').length).toBeLessThan(12);
  });

  test('clamps the visible range when the row set shrinks after scrolling', async () => {
    const rows = Array.from({ length: 200 }, (_, index) => ({
      id: `row-${index + 1}`,
      label: `Row ${index + 1}`,
    }));
    const renderTable = (nextRows: typeof rows) => (
      <VirtualizedMetricTable
        ariaLabel="Test table"
        columns={
          <tr>
            <th className="px-4 py-3">Label</th>
          </tr>
        }
        rows={nextRows}
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
    const { rerender } = render(renderTable(rows));

    const scroller = screen.getByTestId('virtualized-table-scroll');
    Object.defineProperty(scroller, 'scrollTop', {
      configurable: true,
      value: 1160,
      writable: true,
    });
    fireEvent.scroll(scroller);
    expect(await screen.findByText('Row 30')).toBeInTheDocument();

    rerender(renderTable(rows.slice(0, 5)));

    expect(screen.getByText('Row 1')).toBeInTheDocument();
    expect(screen.getByText('Row 5')).toBeInTheDocument();
    expect(screen.queryByText('Row 30')).not.toBeInTheDocument();
  });
});
