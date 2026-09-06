import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { bankBySubtest } from '../data/sessionTaskBank';
import { MentorPanel } from './MentorPanel';
import { clearApiKey, setApiKey } from '../lib/apiKeyStore';
import { readMentorLessons } from '../lib/mentorMemory';

afterEach(() => { clearApiKey(); vi.unstubAllGlobals(); });

describe('interactive mentor', () => {
  it('offers strategy and progressive hints while requiring a response for review', async () => {
    render(<MentorPanel task={bankBySubtest.reading[0]} response="" completed={[]} />);
    expect(screen.getByRole('button', { name: 'Review my response' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Teach the approach' }));
    expect(await screen.findByText(/Your turn:/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Give me a hint' }));
    expect(await screen.findByText(/Hint 1:/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Give me a hint' }));
    expect(await screen.findByText(/Hint 2:/)).toBeVisible();
  });
  it('reviews the actual answer and reports which draft was reviewed', async () => {
    const task = bankBySubtest.reading[0];
    const response = task.options!.find((option) => option.correct)!.id;
    const onReviewed = vi.fn();
    render(<MentorPanel task={task} response={response} completed={[]} onReviewed={onReviewed} />);
    fireEvent.click(screen.getByRole('button', { name: 'Review my response' }));
    expect(await screen.findByText(/Your answer is correct/)).toBeVisible();
    expect(onReviewed).toHaveBeenCalledWith(response);
  });
  it('flushes a recent draft and reply when navigating away before autosave', async () => {
    const task = bankBySubtest.reading[0];
    const { unmount } = render(<MentorPanel task={task} response="My latest draft" completed={[]} lessonKey="resume-test" />);
    fireEvent.click(screen.getByRole('button', { name: 'Teach the approach' }));
    await screen.findByText(/Your turn:/);
    unmount();
    const lesson = readMentorLessons()['resume-test'];
    expect(lesson.response).toBe('My latest draft');
    expect(lesson.messages.at(-1)?.text).toContain('Your turn:');
  });
  it('collects doctor turns in patient mode and makes the guide limitation visible', async () => {
    const onPatientTurn = vi.fn();
    render(<MentorPanel task={bankBySubtest.speaking[0]} response="" completed={[]} onPatientTurn={onPatientTurn} />);
    fireEvent.change(screen.getByLabelText('Conversation mode'), { target: { value: 'patient' } });
    fireEvent.change(screen.getByLabelText('Your words to the patient'), { target: { value: 'I understand your concern.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Speak to patient' }));
    expect(await screen.findByText(/Thank you for listening/)).toBeVisible();
    expect(onPatientTurn).toHaveBeenCalledWith('I understand your concern.');
    expect(screen.getByText(/Live AI adds open-ended/)).toBeVisible();
  });
  it('recovers from a failed live request without appending the user message twice', async () => {
    act(() => setApiKey('fake-test-key'));
    const event = 'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Try checking the qualifier."}}\n\ndata: {"type":"message_stop"}\n\n';
    const fetch = vi.fn().mockRejectedValueOnce(new TypeError('offline')).mockResolvedValueOnce(new Response(event));
    vi.stubGlobal('fetch', fetch);
    render(<MentorPanel task={bankBySubtest.reading[0]} response="" completed={[]} />);
    fireEvent.change(screen.getByLabelText('Ask your mentor'), { target: { value: 'Which clue should I inspect?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send to mentor' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not connect');
    fireEvent.click(screen.getByRole('button', { name: 'Retry reply' }));
    await waitFor(() => expect(screen.getByText('Try checking the qualifier.')).toBeVisible());
    expect(screen.getAllByText('Which clue should I inspect?')).toHaveLength(1);
  });
});
