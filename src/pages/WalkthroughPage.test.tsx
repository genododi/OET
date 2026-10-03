import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WalkthroughPage } from './WalkthroughPage';
import { StartPage } from './StartPage';
import { walkthroughs, walkthroughStorageKey } from '../data/walkthroughs';
import { SessionRunner } from '../components/SessionRunner';
import type { SessionConfig } from '../types/session';

describe('guided learning and human listening', () => {
  beforeEach(() => localStorage.clear());
  it('gives a first-time learner one clear starting action', () => {
    const navigate = vi.fn(); render(<StartPage onNavigate={navigate} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start my first walkthrough' }));
    expect(navigate).toHaveBeenCalledWith('walkthrough', 'listening-a');
  });
  it('uses the original matched recording and reveals reasoning only on request', () => {
    const navigate = vi.fn(); const { container } = render(<WalkthroughPage itemId="listening-b" onNavigate={navigate} />);
    expect(container.querySelector('audio')?.getAttribute('src')).toContain('/audio/real-listening/source-sample-test-1.mp3');
    expect(screen.getByRole('link', { name: /matching question paper/ })).toHaveAttribute('href', expect.stringContaining('oet-listening-sample-test-1.pdf#page=6'));
    expect(screen.queryByRole('region', { name: 'Worked explanation' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show worked explanation' }));
    expect(screen.getByText('B — preventing a fall')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Mark complete/ }));
    expect(JSON.parse(localStorage.getItem(walkthroughStorageKey)!)).toEqual(['listening-b']);
    expect(navigate).toHaveBeenCalledWith('walkthrough', 'listening-c');
  });
  it('resumes incomplete lessons and keeps Writing and Speaking structures accurate', () => {
    localStorage.setItem(walkthroughStorageKey, JSON.stringify(['listening-a']));
    render(<WalkthroughPage onNavigate={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Listening B · Identify the purpose' })).toBeInTheDocument();
    expect(walkthroughs).toHaveLength(8);
    expect(walkthroughs.find(item => item.id === 'writing')?.format).toContain('no Parts A/B/C');
    expect(walkthroughs.find(item => item.id === 'speaking')?.format).toContain('no Parts A/B/C');
  });
  it('blocks legacy generated Listening sessions before any audio is mounted', () => {
    const config = { tasks: [{ id: 'legacy', subtest: 'listening', audioSrc: '/audio/question-matched/old.mp3' }] } as SessionConfig;
    const { container } = render(<SessionRunner config={config} onExit={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Continue with original listening audio' })).toBeInTheDocument();
    expect(container.querySelector('audio')).toBeNull();
    expect(screen.getByRole('button', { name: /Real Audio Listening Test 1/ })).toBeInTheDocument();
  });
});
