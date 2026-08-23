import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StudyPlannerPage } from './StudyPlannerPage';

describe('first-run diagnostic', () => {
  it('generates and persists a personalised Grade A plan', () => {
    render(<StudyPlannerPage onNavigate={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('writing baseline score'), { target: { value: '300' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate Grade A plan' }));
    expect(screen.getByTestId('study-plan-results')).toHaveTextContent('Target 450+');
    expect(localStorage.getItem('oet-study-partner-study-plan')).toContain('"targetScore":450');
  });
});
