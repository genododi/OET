import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { CollectionTestPicker } from './CollectionTestPicker';

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });
const tests = [1, 2, 3].map(number => ({ id: String(number), title: `Test ${number}` }));
const props = { collectionId: 'reading', collectionName: 'Reading', tests, selectedId: '1', label: 'Reading test' };

it('persists each test independently, preserves existing file completion and isolates collection namespaces', () => {
  localStorage.setItem('oet-file-completion-v1', JSON.stringify({ 'original-file-sha': true }));
  const view = render(<CollectionTestPicker {...props} onSelect={vi.fn()} />);
  fireEvent.click(screen.getByRole('checkbox', { name: 'Done: Reading · Test 1' }));
  expect(JSON.parse(localStorage.getItem('oet-file-completion-v1')!)).toEqual({ 'original-file-sha': true, 'collection-test:reading:1': true });
  view.rerender(<CollectionTestPicker {...props} selectedId="2" onSelect={vi.fn()} />);
  expect(screen.getByRole('checkbox')).not.toBeChecked();
  view.rerender(<CollectionTestPicker {...props} collectionId="listening" onSelect={vi.fn()} />);
  expect(screen.getByRole('checkbox')).not.toBeChecked();
  view.unmount();
  render(<CollectionTestPicker {...props} onSelect={vi.fn()} />);
  expect(screen.getByRole('checkbox')).toBeChecked();
  fireEvent.click(screen.getByRole('checkbox'));
  expect(JSON.parse(localStorage.getItem('oet-file-completion-v1')!)).toEqual({ 'original-file-sha': true });
});

it('filters navigation while keeping an excluded open test and its workspace untouched', () => {
  localStorage.setItem('oet-file-completion-v1', JSON.stringify({ 'collection-test:reading:1': true, 'collection-test:reading:2': true }));
  const onSelect = vi.fn();
  render(<CollectionTestPicker {...props} onSelect={onSelect} />);
  fireEvent.change(screen.getByLabelText('Filter by completion'), { target: { value: 'undone' } });
  const select = screen.getByLabelText('Reading test');
  expect(select).toHaveValue('1');
  expect(within(select).queryByRole('option', { name: /Test 2/ })).toBeNull();
  expect(screen.getByText(/This test does not match/)).toBeVisible();
  expect(onSelect).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Next test' }));
  expect(onSelect).toHaveBeenLastCalledWith('3');
  expect(screen.getByRole('button', { name: 'Previous test' })).toBeDisabled();
});

it('handles an empty filter and lets the learner undo completion without losing the open test', () => {
  render(<CollectionTestPicker {...props} tests={[tests[0]]} onSelect={vi.fn()} />);
  fireEvent.change(screen.getByLabelText('Filter by completion'), { target: { value: 'undone' } });
  fireEvent.click(screen.getByRole('checkbox'));
  expect(screen.getByText(/No tests match/)).toBeVisible();
  expect(screen.getByLabelText('Reading test')).toHaveValue('1');
  expect(screen.getByText(/1 of 1 tests done/)).toBeVisible();
  fireEvent.click(screen.getByRole('checkbox'));
  expect(screen.queryByText(/No tests match/)).toBeNull();
  expect(screen.getByText(/0 of 1 tests done/)).toBeVisible();
});

it('reports a failed save without falsely marking the test as finished', () => {
  render(<CollectionTestPicker {...props} onSelect={vi.fn()} />);
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Full'); });
  fireEvent.click(screen.getByRole('checkbox'));
  expect(screen.getByRole('alert')).toHaveTextContent('Could not save completion');
  expect(screen.getByRole('checkbox')).not.toBeChecked();
});
