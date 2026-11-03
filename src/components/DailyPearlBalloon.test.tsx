import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { DailyPearlBalloon } from './DailyPearlBalloon';
afterEach(()=>{cleanup();vi.useRealTimers();});
it('shows one daily balloon, remembers dismissal and suppresses popups during timed study',()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date(2026,10,3,12));
 const view=render(<DailyPearlBalloon section="home" />);
 act(()=>vi.advanceTimersByTime(2600));expect(screen.getByRole('dialog')).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Close daily pearl'}));view.unmount();
 render(<DailyPearlBalloon section="home" />);act(()=>vi.advanceTimersByTime(10000));expect(screen.queryByRole('dialog')).toBeNull();cleanup();
 render(<DailyPearlBalloon section="mock" />);act(()=>vi.advanceTimersByTime(10000));expect(screen.queryByRole('dialog')).toBeNull();expect(screen.queryByRole('button',{name:/Daily pearl/})).toBeNull();
});
it('honours a profile’s pause preference while allowing manual reading',()=>{
 vi.useFakeTimers();localStorage.setItem('oet-daily-pearl-paused-v1','yes');render(<DailyPearlBalloon section="materials" />);
 act(()=>vi.advanceTimersByTime(10000));expect(screen.queryByRole('dialog')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:/Daily pearl/}));expect(screen.getByRole('dialog')).toBeVisible();
});
