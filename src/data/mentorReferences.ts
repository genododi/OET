import type { OetSubtest } from '../types';

export interface MentorReference {
  id: string;
  title: string;
  author: string;
  skills: OetSubtest[];
  url: string;
  verifiedFrom: string;
  teachingNote?: string;
  kind: 'Public video' | 'Public teaching note' | 'Public channel' | 'Instructor page';
}

/** Links and short, original paraphrases only. Video titles do not imply transcript ingestion. */
export const mentorReferences: MentorReference[] = [
  { id: 'oet-reading-a-live', title: 'Reading Part A preparation', author: 'Official OET', skills: ['reading'], url: 'https://www.youtube.com/live/xF8Rce7ARbg', verifiedFrom: 'https://t.me/s/officialoet', kind: 'Public video' },
  { id: 'oet-qa', title: 'Questions about all four skills with Shakina', author: 'Official OET', skills: ['listening', 'reading', 'writing', 'speaking'], url: 'https://www.youtube.com/live/xng0zvuZ7xw', verifiedFrom: 'https://t.me/s/officialoet', kind: 'Public video' },
  { id: 'oet-language', title: 'Clear, accurate language in healthcare communication', author: 'Official OET', skills: ['speaking', 'listening', 'writing'], url: 'https://oet.com/en-us/post/use-of-inclusive-and-accurate-language-in-oet-testing-materials', verifiedFrom: 'https://oet.com/en-us/post/use-of-inclusive-and-accurate-language-in-oet-testing-materials', teachingNote: 'Adapt terminology to the listener: professional discussions and patient conversations require different language. Explain medical terms in everyday words when speaking with patients.', kind: 'Public teaching note' },
  { id: 'darwish-clarity', title: 'Keep the closing clear and accurate', author: 'Dr Amr Darwish', skills: ['writing'], url: 'https://t.me/s/oetdoctors?before=295', verifiedFrom: 'https://t.me/s/oetdoctors?before=295', teachingNote: 'Prefer an accurate, straightforward invitation to contact you over an elaborate conditional construction you cannot use reliably. Complexity adds no value when the meaning is already clear.', kind: 'Public teaching note' },
  { id: 'darwish-tone', title: 'Avoid judgmental expressions in OET writing', author: 'Dr Amr Darwish', skills: ['writing'], url: 'https://youtu.be/lYfoL6It5jE', verifiedFrom: 'https://t.me/s/oetdoctors?before=295', kind: 'Public video' },
  { id: 'ultimacy', title: 'Free exam walkthroughs', author: 'OET Ultimacy · Dr Ahmed Elgendy', skills: ['listening', 'reading', 'writing', 'speaking'], url: 'https://www.youtube.com/@oetultimacy', verifiedFrom: 'https://www.oetultimacy.com/free-services', kind: 'Public channel' },
  { id: 'ashgan-page', title: 'OET Victory with Dr Ashgan', author: 'Dr Ashgan', skills: ['listening', 'reading', 'writing', 'speaking'], url: 'https://www.facebook.com/OET-Victory-with-Dr-Ashgan-109800194770405/', verifiedFrom: 'https://en.tgchannels.org/channel/pdfology?first=7483&lang=all&size=30&start=5917', kind: 'Instructor page' },
];

export function referencesForSkill(skill: OetSubtest) {
  return mentorReferences.filter((reference) => reference.skills.includes(skill));
}
