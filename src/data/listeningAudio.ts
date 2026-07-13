/** Official OET listening audio — run `npm run import-audio` to refresh local copies. */

import type { MockExam, PracticeModule } from '../types';
import { baseUrl } from '../lib/baseUrl';

export interface ListeningAudioTrack {
  id: string;
  label: string;
  /** Served from public/ after import-audio */
  localPath?: string;
  /** CDN MP3 or official SoundCloud stream URL */
  cdnUrl?: string;
  /** When no downloadable MP3 exists (Mini Test #1 interactive link) */
  externalUrl?: string;
  note?: string;
}

export const listeningAudioTracks: ListeningAudioTrack[] = [
  {
    id: 'sample-test-1',
    label: 'Listening Sample Test 1 — full official recording (~40 min)',
    localPath: '/audio/listening/listening-sample-test-1.mp3',
    cdnUrl: 'https://soundcloud.com/oet-450564055/oet-sample-test-1-new',
    note: 'Pair with Book PDF “Listening Sample Test 1” and official-style mocks.',
  },
  {
    id: 'sample-test-2',
    label: 'Listening Sample Test 2 — full official recording (~40 min)',
    localPath: '/audio/listening/listening-sample-test-2.mp3',
    cdnUrl: 'https://soundcloud.com/oet-450564055/oet-listening-sample-test-2',
    note: 'Pair with Book PDF “Listening Sample Test 2”. Part B clip Q28 also available separately.',
  },
  {
    id: 'sample-test-3',
    label: 'Listening Sample Test 3 — full official recording (~40 min)',
    localPath: '/audio/listening/listening-sample-test-3.mp3',
    cdnUrl:
      'https://cdn-aus.aglty.io/oet/pdf-files/sample-tests/Listening-Sample-Test-3-Audio.mp3',
    note: 'Pair with Book PDF “Listening Sample Test 3” and mock-official-listening-3.',
  },
  {
    id: 'part-b-sample-q28',
    label: 'Part B extract — Sample Test 2, Question 28 (official clip)',
    localPath: '/audio/listening/part-b-sample-test-2-q28.mp3',
    cdnUrl: 'https://cdn-aus.aglty.io/oet/education/Test%202%20Q%2028.mp3',
    note: 'Short Part B demo from oet.com/learn/listening — use for MCQ timing practice.',
  },
  {
    id: 'mini-listening-1',
    label: 'OET Mini Listening Test #1 — audio link in PDF',
    externalUrl: 'https://oet.com/learn/listening/listening-sample-tests',
    note:
      'No public MP3 on OET CDN. Open the Mini Listening PDF in Books — page 1 links to the official mini-test recording on oet.com.',
  },
];

const trackById = new Map(listeningAudioTracks.map((t) => [t.id, t]));

export function getListeningTrack(id: string): ListeningAudioTrack | undefined {
  return trackById.get(id);
}

/** Prefer bundled file; fall back to CDN / SoundCloud stream. */
export function resolveAudioSrc(track: ListeningAudioTrack): string | undefined {
  return track.localPath ? `${baseUrl}${track.localPath.replace(/^\//, '')}` : track.cdnUrl;
}

function idHash(id: string, size: number): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash + id.charCodeAt(i) * (i + 1)) % size;
  }
  return hash;
}

const mockAudioMap: Record<string, string> = {
  'mock-official-listening-1': 'sample-test-1',
  'mock-official-listening-2': 'sample-test-2',
  'mock-official-listening-3': 'sample-test-3',
  'mock-listening-1': 'sample-test-1',
  'mock-listening-2': 'sample-test-2',
  'mock-listening-3': 'mini-listening-1',
  'mock-listening-4': 'sample-test-1',
  'mock-listening-5': 'sample-test-2',
  'mock-listening-spelling-drill': 'sample-test-1',
  'mock-lrw-combo-1': 'sample-test-2',
  'mock-lrw-combo-2': 'sample-test-3',
  'mock-cbt-home': 'sample-test-2',
  'mock-tg-doctors-hub-1': 'sample-test-1',
  'mock-tg-pharmacy-1': 'sample-test-2',
};

const practiceAudioMap: Record<string, string> = {
  'prac-listening-a': 'sample-test-1',
  'prac-listening-b': 'part-b-sample-q28',
  'prac-listening-c': 'sample-test-1',
  'prac-listening-d': 'sample-test-1',
  'prac-listening-e': 'part-b-sample-q28',
  'prac-listening-f': 'sample-test-2',
  'prac-listening-g': 'sample-test-1',
  'prac-listening-h': 'sample-test-1',
  'prac-listening-i': 'mini-listening-1',
  'prac-listening-j': 'sample-test-2',
  'prac-listening-k': 'part-b-sample-q28',
  'prac-listening-l': 'sample-test-3',
  'prac-listening-m': 'sample-test-2',
  'prac-med-l1': 'part-b-sample-q28',
  'prac-med-l2': 'sample-test-2',
  'prac-med-l3': 'sample-test-1',
  'prac-med-l4': 'sample-test-1',
  'prac-med-l5': 'part-b-sample-q28',
  'prac-med-l6': 'sample-test-1',
  'prac-med-l7': 'sample-test-2',
  'prac-med-l8': 'part-b-sample-q28',
};

const bookAudioMap: Record<string, string> = {
  'book-listening-1': 'sample-test-1',
  'book-listening-2': 'sample-test-2',
  'book-listening-3': 'sample-test-3',
  'book-mini-listening-1': 'mini-listening-1',
};

function inferTrackIdForPractice(module: PracticeModule): string | undefined {
  const text = `${module.title} ${module.topic} ${module.description}`.toLowerCase();
  if (text.includes('mini test') || text.includes('mini format')) return 'mini-listening-1';
  if (text.includes('sample test 3') || text.includes('sample 3')) return 'sample-test-3';
  if (text.includes('sample test 2') || text.includes('sample 2')) return 'sample-test-2';
  if (text.includes('sample test 1') || text.includes('sample 1') || text.includes('official sample')) {
    return 'sample-test-1';
  }
  if (text.includes('part b')) {
    if (text.includes('six') || text.includes('mix') || text.includes('extracts')) {
      return 'sample-test-2';
    }
    return 'part-b-sample-q28';
  }
  if (text.includes('part c')) {
    return ['sample-test-1', 'sample-test-2', 'sample-test-3'][idHash(module.id, 3)];
  }
  if (text.includes('part a')) return 'sample-test-1';
  return 'sample-test-1';
}

function inferTrackIdForMock(exam: MockExam): string | undefined {
  if (!exam.subtests.includes('listening')) return undefined;
  const text = `${exam.id} ${exam.title} ${exam.description}`.toLowerCase();
  if (text.includes('mini') || text.includes('spelling')) return 'mini-listening-1';
  if (text.includes('sample 3') || text.includes('set c') && text.includes('listening mini')) {
    return 'sample-test-3';
  }
  if (text.includes('sample 2') || text.includes('set e')) return 'sample-test-2';
  if (text.includes('sample 1') || text.includes('set a') && exam.subtests.length === 1) {
    return 'sample-test-1';
  }
  if (text.includes('telehealth') || text.includes('set d')) return 'sample-test-1';
  if (text.includes('beginner') && exam.subtests.length === 1) return 'mini-listening-1';
  return ['sample-test-1', 'sample-test-2', 'sample-test-3'][idHash(exam.id, 3)];
}

export function getListeningAudioForMock(mockId: string): ListeningAudioTrack | undefined {
  const trackId = mockAudioMap[mockId];
  if (trackId) return getListeningTrack(trackId);
  return undefined;
}

export function getListeningAudioForPractice(practiceId: string): ListeningAudioTrack | undefined {
  const trackId = practiceAudioMap[practiceId];
  return trackId ? getListeningTrack(trackId) : undefined;
}

export function getListeningAudioForBook(bookId: string): ListeningAudioTrack | undefined {
  const trackId = bookAudioMap[bookId];
  return trackId ? getListeningTrack(trackId) : undefined;
}

/** Resolve audio for a practice module — explicit map first, then topic heuristics. */
export function resolveListeningAudioForPractice(
  module: PracticeModule,
): ListeningAudioTrack | undefined {
  if (module.subtest !== 'listening') return undefined;
  const explicit = getListeningAudioForPractice(module.id);
  if (explicit) return explicit;
  const inferred = inferTrackIdForPractice(module);
  return inferred ? getListeningTrack(inferred) : undefined;
}

/** Resolve audio for a mock exam — explicit map first, then heuristics for full mocks. */
export function resolveListeningAudioForMock(exam: MockExam): ListeningAudioTrack | undefined {
  if (!exam.subtests.includes('listening')) return undefined;
  const explicit = getListeningAudioForMock(exam.id);
  if (explicit) return explicit;
  const inferred = inferTrackIdForMock(exam);
  return inferred ? getListeningTrack(inferred) : undefined;
}
