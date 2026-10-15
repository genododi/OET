import { describe, expect, it } from 'vitest';
import { detectListeningPartStarts } from './listeningKeywords';

describe('detectListeningPartStarts', () => {
  it('joins split announcement lines and uses the transition into the next part', () => {
    const starts = detectListeningPartStarts([
      { start: 0, text: 'Opening instructions.' },
      { start: 34, text: 'Part A.' },
      { start: 36, text: 'In this part of the test you will hear two extracts.' },
      { start: 610, text: 'That is the end of Part A.' },
      { start: 614, text: 'Now, look at Part B.' },
      { start: 620, text: 'Part B.' },
      { start: 622, text: 'In this part of the test you will hear six extracts.' },
      { start: 1100, text: 'That is the end of Part B. Now look at Part C.' },
      { start: 1105, text: 'Part C.' },
      { start: 1107, text: 'In this part of the test you will hear two extracts.' },
    ]);
    expect(starts).toEqual({ A: 34, B: 614, C: 1100 });
  });

  it('uses the natural beginning for a recording file that contains only one named part', () => {
    expect(detectListeningPartStarts([{ start: 0, text: 'You hear a nurse talking to a colleague.' }], '3-Part B.mp3'))
      .toEqual({ B: 0 });
  });

  it('does not mistake the end of Part A for its beginning', () => {
    expect(detectListeningPartStarts([
      { start: 0, text: 'Opening instructions.' },
      { start: 25, text: 'Complete your answers as you listen. Part' },
      { start: 32, text: 'A. In this part of the test you will hear two extracts.' },
      { start: 620, text: 'That is the end of Part A. Now, look at Part B.' },
      { start: 640, text: 'For questions 25 to 30, choose the answer that fits best.' },
    ])).toEqual({ A: 25, B: 620 });
  });
});
