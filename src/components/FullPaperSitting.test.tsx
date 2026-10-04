import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { FullPaperSitting } from './FullPaperSitting';
vi.mock('./RealListeningTestRunner', () => ({ RealListeningTestRunner: ({ onPlaybackStart, onComplete }: { onPlaybackStart: (start: number) => void; onComplete: () => void }) => <><button onClick={() => onPlaybackStart(1_000_000)}>Play once</button><button onClick={onComplete}>End recording</button></> }));
vi.mock('./OfficialPaperRunner', () => ({ OfficialPaperRunner: ({ skill, onComplete }: { skill: string; onComplete: () => void }) => <button onClick={onComplete}>Finish {skill} phase</button> }));
afterEach(() => { cleanup(); localStorage.clear(); });
it('runs listening, reading and writing in order without exposing the key between sections', () => {
  render(<FullPaperSitting sample={1} onExit={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Play once' }));
  fireEvent.click(screen.getByRole('button', { name: 'End recording' }));
  expect(screen.queryByRole('link', { name: /Review official/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Finish reading phase' }));
  expect(screen.queryByRole('link', { name: /Review official/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Finish writing phase' }));
  expect(screen.getByRole('heading', { name: 'Written sitting complete' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Review official answers ↗' })).toBeInTheDocument();
});
it('does not replay listening when an active full sitting is reloaded', () => {
  localStorage.setItem('oet-full-paper-sitting-1-v1', JSON.stringify({ phase: 'listening', listeningStartedAt: 1_000_000 }));
  render(<FullPaperSitting sample={1} onExit={vi.fn()} />);
  expect(screen.getByRole('heading', { name: 'Listening was interrupted' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Play once' })).not.toBeInTheDocument();
});
