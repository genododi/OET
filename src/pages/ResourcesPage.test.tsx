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
});
