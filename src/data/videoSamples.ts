import type { OetSubtest } from '../types';

export interface VideoSample {
  subtest: OetSubtest;
  provider: string;
  title: string;
  url: string;
  note: string;
}

/**
 * Curated public YouTube starting points. These supplement the app's original tasks;
 * third-party recordings are linked, never copied or presented as official OET papers.
 */
export const youtubeVideoSamples: VideoSample[] = [
  {
    subtest: 'listening',
    provider: 'Official OET',
    title: 'Official OET — Listening preparation videos',
    url: 'https://www.youtube.com/@OfficialOET/search?query=listening',
    note: 'Use alongside the official sample-test audio already available in the app.',
  },
  {
    subtest: 'reading',
    provider: 'Official OET',
    title: 'Official OET — Reading Part A guidance',
    url: 'https://www.youtube.com/@OfficialOET/search?query=reading%20part%20a',
    note: 'Useful for timing and expeditious-reading technique.',
  },
  {
    subtest: 'writing',
    provider: 'E2 OET',
    title: 'E2 OET — Writing sample walkthroughs',
    url: 'https://www.youtube.com/@E2OET/search?query=writing%20sample',
    note: 'Compare structure and task selection; write your own response before viewing feedback.',
  },
  {
    subtest: 'speaking',
    provider: 'Official OET',
    title: 'Official OET — Speaking role-play examples',
    url: 'https://www.youtube.com/@OfficialOET/search?query=speaking%20role%20play',
    note: 'Watch for interaction, empathy, and patient-centred language rather than memorising lines.',
  },
  {
    subtest: 'listening',
    provider: 'Swoosh English',
    title: 'Swoosh English — OET listening strategy videos',
    url: 'https://www.youtube.com/@SwooshEnglish/search?query=OET%20listening',
    note: 'Supplementary strategy practice; not an official test recording.',
  },
  {
    subtest: 'reading',
    provider: 'E2 OET',
    title: 'E2 OET — Reading practice walkthroughs',
    url: 'https://www.youtube.com/@E2OET/search?query=reading%20practice',
    note: 'Use to review method after completing a timed in-app task.',
  },
];

export function videoSamplesFor(subtest: OetSubtest | 'all'): VideoSample[] {
  return subtest === 'all'
    ? youtubeVideoSamples.filter((sample, index, all) =>
        all.findIndex((candidate) => candidate.subtest === sample.subtest) === index,
      )
    : youtubeVideoSamples.filter((sample) => sample.subtest === subtest);
}
