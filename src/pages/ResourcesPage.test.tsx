import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ResourcesPage } from './ResourcesPage';

describe('resource library', () => {
  it('filters the source-governed catalog', () => {
    render(<ResourcesPage />);
    fireEvent.change(screen.getByLabelText('Search resources'), { target: { value: 'masterclass' } });
    const grid = screen.getByTestId('resource-grid');
    expect(within(grid).getByText(/Speaking for Doctors/)).toBeInTheDocument();
    expect(within(grid).queryByText(/Dr. VisalW/)).not.toBeInTheDocument();
  });

  it('searches the complete private GENODODI source index', () => {
    render(<ResourcesPage />);
    fireEvent.click(screen.getByRole('button', { name: /Private source index \(993\)/ }));
    fireEvent.change(screen.getByLabelText('Search private source index'), {
      target: { value: 'OfficialGuidetoOETKaplanTestPrep' },
    });

    const grid = screen.getByTestId('private-source-grid');
    expect(within(grid).getAllByText(/OfficialGuidetoOETKaplanTestPrep/)).toHaveLength(2);
    expect(within(grid).getByText(/SHA-256/)).toBeInTheDocument();
  });
});
