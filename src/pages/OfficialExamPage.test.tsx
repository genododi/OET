import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { OfficialExamPage } from './OfficialExamPage';
afterEach(() => { cleanup(); sessionStorage.clear(); });
it('defaults to the requested paper version and original full papers', () => {
  render(<OfficialExamPage initialSkill="reading" />);
  expect(screen.getByRole('button', { name: 'OET on Paper' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('heading', { name: 'Reading · full 42-question papers' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Load official/ })).not.toBeInTheDocument();
});
it('loads only the selected official computer sample when explicitly requested', () => {
  render(<OfficialExamPage />);
  fireEvent.click(screen.getByRole('button', { name: 'OET on Computer / OET@Home' }));
  fireEvent.change(screen.getByLabelText('Choose a Medicine sample'), { target: { value: '2' } });
  expect(screen.queryByTitle('Official Medicine computer sample 2')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Load official sample 2' }));
  expect(screen.getByTitle('Official Medicine computer sample 2')).toHaveAttribute('src', 'https://training.prod.prometric.mindgrb.io/CBLA-Tutorial/OETNew_SampleTest2_Med/launch_html_delivery.html');
});

it('reopens the selected paper after a page reload', () => {
  const view = render(<OfficialExamPage initialSkill="writing" />);
  fireEvent.click(screen.getByRole('button', { name: 'Start writing sample 2' }));
  view.unmount();
  render(<OfficialExamPage initialSkill="writing" />);
  expect(screen.getByRole('heading', { name: 'Official Medicine paper sample 2 · writing' })).toBeInTheDocument();
});
