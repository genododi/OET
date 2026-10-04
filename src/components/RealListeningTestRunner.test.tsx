import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { RealListeningTestRunner } from './RealListeningTestRunner';
import { realListeningTests } from '../data/realListeningTests';
const markComplete = vi.fn();
vi.mock('../hooks/useProgress', () => ({ useProgress: () => ({ markComplete }) }));
vi.mock('./PdfViewer', () => ({ PdfViewer: () => <div>Matched official paper</div> }));
vi.mock('./AudioPlayer', () => ({ AudioPlayer: (props: { onExamPlay: () => void; onPlaybackEnd: () => void; onPlaybackError: () => void }) => <><button onClick={props.onExamPlay}>Start original audio</button><button onClick={props.onPlaybackEnd}>Audio ended</button><button onClick={props.onPlaybackError}>Audio failed</button></> }));
beforeEach(() => { sessionStorage.clear(); markComplete.mockClear(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-04T12:00:00Z')); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
it('waits for actual playback, then submits at the recording end without adding checking time', () => {
  render(<RealListeningTestRunner test={realListeningTests[0]} onExit={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Start real listening test' }));
  expect(screen.queryByRole('region', { name: 'Listening answer sheet' })).not.toBeInTheDocument();
  act(() => vi.advanceTimersByTime(600_000));
  expect(markComplete).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Start original audio' }));
  expect(screen.getByRole('region', { name: 'Listening answer sheet' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Submit all answers' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Audio ended' }));
  expect(screen.getByRole('heading', { name: 'Real listening test complete' })).toBeInTheDocument();
  expect(markComplete).toHaveBeenCalledTimes(1);
});
it('does not issue a completed test result for failed audio', () => {
  render(<RealListeningTestRunner test={realListeningTests[0]} onExit={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Start real listening test' }));
  fireEvent.click(screen.getByRole('button', { name: 'Start original audio' }));
  fireEvent.click(screen.getByRole('button', { name: 'Audio failed' }));
  act(() => vi.advanceTimersByTime(2400_000));
  expect(markComplete).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toHaveTextContent('not a completed exam attempt');
});

it('rejects replay after reloading an active recording', () => {
  const view = render(<RealListeningTestRunner test={realListeningTests[0]} onExit={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Start real listening test' }));
  fireEvent.click(screen.getByRole('button', { name: 'Start original audio' }));
  view.unmount();
  render(<RealListeningTestRunner test={realListeningTests[0]} onExit={vi.fn()} />);
  expect(screen.getByRole('heading', { name: 'Listening was interrupted' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Start real listening test' })).not.toBeInTheDocument();
});
