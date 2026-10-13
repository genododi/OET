import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { StudyAudioPlayer } from './StudyAudioPlayer';
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });
function setup() {
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function(this: HTMLMediaElement) { Object.defineProperty(this, 'paused', { configurable: true, value: false }); fireEvent.play(this); return Promise.resolve(); });
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function(this: HTMLMediaElement) { Object.defineProperty(this, 'paused', { configurable: true, value: true }); fireEvent.pause(this); });
  const load = vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(function(this: HTMLMediaElement) { this.currentTime = 0; fireEvent.loadStart(this); });
  const view = render(<StudyAudioPlayer src="/original.m4a" label="Original human recording" />);
  const audio = view.container.querySelector('audio')!;
  Object.defineProperty(audio, 'duration', { configurable: true, value: 300 });
  fireEvent.loadedMetadata(audio);
  return { audio, load };
}
it('reopens the decoder on resume and restores position without resetting the volume', async () => {
  const { audio, load } = setup();
  fireEvent.click(screen.getByRole('button', { name: 'Play recording' }));
  await waitFor(() => expect(audio.paused).toBe(false));
  audio.currentTime = 75; audio.volume = 0.4;
  fireEvent.click(screen.getByRole('button', { name: 'Pause recording' }));
  fireEvent.click(screen.getByRole('button', { name: 'Play recording' }));
  expect(load).toHaveBeenCalledTimes(1);
  fireEvent.loadedMetadata(audio);
  expect(audio.currentTime).toBe(75);
  expect(audio.volume).toBe(0.4);
});
it('restores sound at the current position and clears a silent volume or mute state', async () => {
  const { audio, load } = setup();
  audio.currentTime = 120; audio.volume = 0; audio.muted = true;
  fireEvent.click(screen.getByRole('button', { name: 'Restore sound' }));
  fireEvent.loadedMetadata(audio);
  await waitFor(() => expect(audio.paused).toBe(false));
  expect(load).toHaveBeenCalledTimes(1);
  expect(audio.currentTime).toBe(120);
  expect(audio.muted).toBe(false);
  expect(audio.volume).toBe(1);
});
it('honours an intentional mute on ordinary pause and resume', async () => {
  const { audio } = setup();
  fireEvent.click(screen.getByRole('button', { name: 'Play recording' }));
  await waitFor(() => expect(audio.paused).toBe(false));
  fireEvent.click(screen.getByRole('button', { name: 'Mute' }));
  fireEvent.click(screen.getByRole('button', { name: 'Pause recording' }));
  fireEvent.click(screen.getByRole('button', { name: 'Play recording' }));
  fireEvent.loadedMetadata(audio);
  expect(audio.muted).toBe(true);
  expect(screen.getByRole('button', { name: 'Unmute' })).toBeVisible();
});

it('recovers cached Safari metadata even when the initial metadata event was missed', async () => {
  vi.useFakeTimers();
  const ready = vi.fn();
  const view = render(<StudyAudioPlayer src="/cached.mp3" label="Cached recording" onReady={ready} />);
  const audio = view.container.querySelector('audio')!;
  Object.defineProperty(audio, 'duration', { configurable: true, value: 600 });
  Object.defineProperty(audio, 'readyState', { configurable: true, value: 1 });
  audio.currentTime = 120;
  await act(async () => { await vi.advanceTimersByTimeAsync(100); });
  expect(screen.getByRole('slider', { name: 'Recording position' })).toBeEnabled();
  expect(ready).toHaveBeenCalledWith(600);
  expect(audio.currentTime).toBe(120);
});
