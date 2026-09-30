import { afterEach, beforeEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AuthenticListeningPage } from './AuthenticListeningPage';
import { NotebookPage } from './NotebookPage';
beforeEach(() => localStorage.clear());
afterEach(cleanup);

it('keeps each recording paired with its paper and restores separate answer drafts', () => {
  const first = render(<AuthenticListeningPage />);
  fireEvent.change(screen.getByLabelText('My numbered answers and listening review'), { target: { value: '1. fatigue' } });
  fireEvent.click(screen.getByRole('button', { name: 'Load original audio player' }));
  expect(screen.getByTitle('OET Listening Sample Test 1 original recording')).toHaveAttribute('src', expect.stringContaining('1917931694'));
  fireEvent.click(screen.getByRole('button', { name: 'Review with the official answer key' }));
  expect(screen.getByRole('link', { name: /Sample Test 1 answer key/ })).toHaveAttribute('href', expect.stringContaining('Test%201%20Answer'));
  fireEvent.click(screen.getByRole('button', { name: 'Sample 4' }));
  expect(screen.getByLabelText('My numbered answers and listening review')).toHaveValue('');
  expect(screen.queryByTitle('OET Listening Sample Test 1 original recording')).toBeNull();
  expect(screen.queryByRole('link', { name: /answer key/ })).toBeNull();
  expect(screen.getByRole('link', { name: 'Open matching question pack ↗' })).toHaveAttribute('href', expect.stringContaining('Test%204%20Questions'));
  fireEvent.change(screen.getByLabelText('My numbered answers and listening review'), { target: { value: '4 notes' } });
  first.unmount();
  render(<AuthenticListeningPage />);
  expect(screen.getByLabelText('My numbered answers and listening review')).toHaveValue('1. fatigue');
  fireEvent.click(screen.getByRole('button', { name: 'Sample 4' }));
  expect(screen.getByLabelText('My numbered answers and listening review')).toHaveValue('4 notes');
});

it('keeps notebook skill drafts separate and routes listening to real recordings', () => {
  render(<NotebookPage />);
  fireEvent.change(screen.getByLabelText('My writing practice and corrections'), { target: { value: 'AMR letter plan' } });
  fireEvent.click(screen.getByRole('button', { name: 'reading' }));
  expect(screen.getByLabelText('My reading practice and corrections')).toHaveValue('');
  fireEvent.click(screen.getByRole('button', { name: 'writing' }));
  expect(screen.getByLabelText('My writing practice and corrections')).toHaveValue('AMR letter plan');
  fireEvent.click(screen.getByRole('button', { name: 'listening' }));
  expect(screen.getByRole('link', { name: /Open real listening/ })).toHaveAttribute('href', '#listening');
});
