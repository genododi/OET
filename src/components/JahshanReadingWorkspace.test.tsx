import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { JahshanReadingWorkspace } from './JahshanReadingWorkspace';
afterEach(() => { cleanup(); localStorage.clear(); });
it('uses the Reading index and separates the shorter paper from full papers', () => {
  render(<JahshanReadingWorkspace bookUrl="blob:reading-book" />);
  expect(screen.getByTitle('Jahshan reading collection')).toHaveAttribute('src', 'blob:reading-book#page=83');
  fireEvent.click(screen.getByRole('button', { name: 'Review answer key' }));
  expect(screen.getByTitle('Jahshan reading collection')).toHaveAttribute('src', 'blob:reading-book#page=102');
  fireEvent.change(screen.getByLabelText('Reading test'), { target: { value: '8' } });
  expect(screen.getByText(/shorter than a full 42-question/)).toBeInTheDocument();
  expect(screen.getByTitle('Jahshan reading collection')).toHaveAttribute('src', 'blob:reading-book#page=192');
  expect(screen.getByLabelText('My self-marked result (out of 34)')).toHaveAttribute('max', '34');
});
it('saves each test and part independently and resumes the last selection after reload', () => {
  const view = render(<JahshanReadingWorkspace />);
  fireEvent.change(screen.getByLabelText('Part A · Question 1', { exact: true }), { target: { value: 'D' } });
  fireEvent.click(screen.getByRole('button', { name: 'Part B' }));
  fireEvent.change(screen.getByLabelText('Part B · Question 1', { exact: true }), { target: { value: 'B' } });
  fireEvent.change(screen.getByLabelText('Reading test'), { target: { value: '4' } });
  expect(screen.getByLabelText('Part A · Question 1', { exact: true })).toHaveValue('');
  fireEvent.change(screen.getByLabelText('Part A · Question 1', { exact: true }), { target: { value: 'C' } });
  view.unmount(); render(<JahshanReadingWorkspace />);
  expect(screen.getByLabelText('Reading test')).toHaveValue('4');
  expect(screen.getByLabelText('Part A · Question 1', { exact: true })).toHaveValue('C');
  fireEvent.change(screen.getByLabelText('Reading test'), { target: { value: '3' } });
  expect(screen.getByLabelText('Part A · Question 1', { exact: true })).toHaveValue('D');
  fireEvent.click(screen.getByRole('button', { name: 'Part B' }));
  expect(screen.getByLabelText('Part B · Question 1', { exact: true })).toHaveValue('B');
});
it('filters entries, tracks review completion and preserves previous book notes', () => {
  localStorage.setItem('oet-jahshan-notes-reading-book', 'Earlier evidence notes');
  render(<JahshanReadingWorkspace />);
  fireEvent.change(screen.getByLabelText('Filter reading source'), { target: { value: 'IRS' } });
  expect(screen.getByLabelText('Reading test')).toHaveValue('21');
  expect(screen.getByRole('button', { name: 'Previous test' })).toBeDisabled();
  fireEvent.click(screen.getByLabelText('I compared my answers with the key and reviewed my mistakes'));
  expect(screen.getByText(/26 entries · 1 reviewed/)).toBeInTheDocument();
  fireEvent.click(screen.getByText('My earlier general Reading notes'));
  expect(screen.getByText('Earlier evidence notes')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Download this test’s answers' })).toHaveAttribute('download', 'jahshan-reading-21-answers.txt');
});

it('filters Sample Test 1 by Text A and reveals only the requested printed answer', () => {
  render(<JahshanReadingWorkspace bookUrl="blob:book" />);
  fireEvent.click(screen.getByRole('button', { name: 'Text A' }));
  expect(screen.getByLabelText('Part A · Question 4', { exact: true })).toBeInTheDocument();
  expect(screen.queryByLabelText('Part A · Question 8', { exact: true })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Part A · Question 15', { exact: true }), { target: { value: 'my attempt' } });
  fireEvent.click(screen.getByRole('button', { name: 'Show answer for Part A · Question 15' }));
  expect(screen.getByText('dislocation', { exact: true })).toBeVisible();
  expect(screen.getByLabelText('Part A · Question 15', { exact: true })).toHaveValue('my attempt');
  expect(screen.queryByText('(a) pillow / pillows', { exact: true })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'View printed key · page 102' }));
  expect(screen.getByTitle('Jahshan reading collection')).toHaveAttribute('src', 'blob:book#page=102');
});
it('preserves existing free-form answers while adding numbered responses', () => {
  localStorage.setItem('oet-jahshan-reading-workspace-v1', JSON.stringify({ selected: 3, drafts: { 3: { A: '1. D — my earlier notes' } } }));
  render(<JahshanReadingWorkspace />);
  fireEvent.click(screen.getByText('Earlier free-form answers and extra Part A notes'));
  expect(screen.getByLabelText('Part A answers', { exact: true })).toHaveValue('1. D — my earlier notes');
  expect(screen.getByLabelText('Part A · Question 1', { exact: true })).toHaveValue('');
});
it('keeps repeated Part C numbering and missing printed answers distinct', () => {
  render(<JahshanReadingWorkspace />);
  fireEvent.change(screen.getByLabelText('Reading test'), { target: { value: '11' } });
  fireEvent.click(screen.getByRole('button', { name: 'Part C' }));
  fireEvent.change(screen.getByLabelText('Part C · Text 1 · Question 1'), { target: { value: 'A' } });
  expect(screen.getByLabelText('Part C · Text 2 · Question 1')).toHaveValue('');
  fireEvent.change(screen.getByLabelText('Reading test'), { target: { value: '8' } });
  fireEvent.click(screen.getByRole('button', { name: 'Show answer for Part A · Question 1' }));
  expect(screen.getByText('No answer is printed for this question in the supplied key.')).toBeVisible();
});
