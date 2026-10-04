import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OfficialPaperRunner } from './OfficialPaperRunner';
import { paperPosition, paperStages } from '../data/officialExamPractice';
vi.mock('./PdfViewer', () => ({ PdfViewer: ({ src, title }: { src: string; title: string }) => <iframe src={src} title={title} /> }));

beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-04T12:00:00Z')); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
function jump(seconds: number) { act(() => { vi.setSystemTime(Date.now() + seconds * 1000); vi.advanceTimersByTime(250); }); }
function start(skill: 'reading' | 'writing') {
  render(<OfficialPaperRunner skill={skill} sample={1} onExit={vi.fn()} />);
  fireEvent.click(screen.getByLabelText('I will write my answers on paper'));
  fireEvent.click(screen.getByRole('button', { name: `Start timed ${skill}` }));
}

describe('official paper phase rules', () => {
  it('locks Part A after 15 minutes and preserves the separate B/C numbering and option counts', () => {
    start('reading');
    expect(screen.getAllByRole('textbox')).toHaveLength(20);
    fireEvent.change(screen.getByLabelText('Part A question 1'), { target: { value: 'C' } });
    jump(900);
    expect(screen.queryByLabelText('Part A question 1')).not.toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent('45:00');
    expect(screen.getAllByRole('group')).toHaveLength(22);
    expect(screen.getAllByRole('radio')).toHaveLength(6 * 3 + 16 * 4);
    expect(screen.queryByRole('button', { name: /Previous/ })).not.toBeInTheDocument();
    expect(screen.getByTitle('Reading Parts B & C · Questions 1–22 official paper')).toHaveAttribute('src', expect.stringContaining('reading-bc.pdf'));
  });
  it('locks writing for five minutes, offers no skip, and keeps the deadline after reload', () => {
    start('writing');
    expect(screen.getByLabelText('Your letter')).toBeDisabled();
    expect(screen.queryByRole('button', { name: /Next|Skip/ })).not.toBeInTheDocument();
    jump(300);
    expect(screen.getByLabelText('Your letter')).toBeEnabled();
    fireEvent.change(screen.getByLabelText('Your letter'), { target: { value: 'Dear Dr Roberts,' } });
    cleanup();
    render(<OfficialPaperRunner skill="writing" sample={1} onExit={vi.fn()} />);
    expect(screen.getByLabelText('Your letter')).toHaveValue('Dear Dr Roberts,');
    jump(2400);
    expect(screen.getByRole('heading', { name: 'Writing practice complete' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Your letter')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open official answers/ })).toBeInTheDocument();
  });
  it('requires a human partner and provides two 3+5-minute role-plays', () => {
    render(<OfficialPaperRunner skill="speaking" sample={1} onExit={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Start timed speaking' })).toBeDisabled();
    fireEvent.click(screen.getByLabelText(/My partner has/));
    fireEvent.click(screen.getByRole('button', { name: 'Start timed speaking' }));
    expect(screen.getByRole('timer')).toHaveTextContent('3:00');
    jump(180);
    expect(screen.getByRole('heading', { name: 'Speak with your partner now' })).toBeInTheDocument();
    jump(300);
    expect(screen.getByTitle('Speaking · Card 2 preparation official paper')).toHaveAttribute('src', expect.stringContaining('sample-2-speaking-candidate.pdf'));
    jump(480);
    expect(screen.getByRole('heading', { name: 'Speaking practice complete' })).toBeInTheDocument();
  });
  it('accounts for entire elapsed phases when a background tab wakes up', () => {
    const stages = paperStages('reading', 2);
    expect(paperPosition(stages, 1000, 1000 + 1200_000)).toEqual({ index: 1, secondsLeft: 2400, done: false });
    expect(paperPosition(stages, 1000, 1000 + 3600_000).done).toBe(true);
  });
});
