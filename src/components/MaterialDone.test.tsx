import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { MaterialDone } from './MaterialDone';
afterEach(() => {cleanup();localStorage.clear();});
it('shares completion for duplicate originals, persists reloads, and allows undo without changing drafts',()=>{
  localStorage.setItem('oet-supplied-v1:my-draft','saved letter');
  const view=render(<><MaterialDone fileId="sha" filename="Case.pdf"/><MaterialDone fileId="sha" filename="Same original.pdf"/><MaterialDone fileId="different" filename="Other.pdf"/></>);
  fireEvent.click(screen.getByLabelText('Done: Case.pdf'));
  expect(screen.getByLabelText('Done: Same original.pdf')).toBeChecked();expect(screen.getByLabelText('Done: Other.pdf')).not.toBeChecked();
  view.unmount();render(<MaterialDone fileId="sha" filename="Case.pdf"/>);
  expect(screen.getByLabelText('Done: Case.pdf')).toBeChecked();fireEvent.click(screen.getByLabelText('Done: Case.pdf'));
  expect(screen.getByLabelText('Done: Case.pdf')).not.toBeChecked();expect(localStorage.getItem('oet-supplied-v1:my-draft')).toBe('saved letter');
});
