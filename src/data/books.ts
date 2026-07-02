import type { BookPdf } from '../types';

/** Official OET materials downloaded from oet.com CDN — run `npm run import-pdfs` to refresh. */
export const bookPdfs: BookPdf[] = [
  {
    id: 'book-ready-guide',
    title: 'OET Ready Study Guide',
    author: 'OET (Cambridge Boxhill Language Assessment)',
    profession: 'All professions',
    pages: 12,
    description:
      'Official preparation roadmap: Intro to OET courses, Masterclasses, study tips, and links to sample tests for all four sub-tests.',
    pdfPath: '/pdfs/books/oet-ready-study-guide.pdf',
    tags: ['official', 'overview', 'study plan'],
  },
  {
    id: 'book-writing-guide',
    title: 'The Ultimate Guide to OET Writing',
    author: 'OET (Cambridge Boxhill Language Assessment)',
    profession: 'All professions',
    pages: 36,
    description:
      'Official deep dive on Writing criteria: Purpose, Content, Conciseness & Clarity, Genre & Style, Organisation & Layout, and Language.',
    pdfPath: '/pdfs/books/oet-ultimate-writing-guide.pdf',
    tags: ['official', 'writing', 'criteria'],
  },
  {
    id: 'book-cefr',
    title: 'OET CEFR Benchmarking Report',
    author: 'OET / UK NARIC',
    profession: 'All professions',
    pages: 8,
    description:
      'Independent review mapping OET grades to CEFR levels (B2–C2) for Nursing, Medicine, Dentistry, and Pharmacy.',
    pdfPath: '/pdfs/books/oet-cefr-benchmarking.pdf',
    tags: ['official', 'scoring', 'reference'],
  },
  {
    id: 'book-mini-listening-1',
    title: 'OET Mini Listening Test #1',
    author: 'OET (Cambridge Boxhill Language Assessment)',
    profession: 'All professions',
    pages: 16,
    description:
      'Official mini test: Part A note completion, six Part B extracts, one Part C presentation — includes audio script and answer keys.',
    pdfPath: '/pdfs/books/oet-mini-listening-test-1.pdf',
    tags: ['official', 'listening', 'mini mock'],
  },
  {
    id: 'book-listening-1',
    title: 'Listening Sample Test 1 — Question Paper',
    author: 'OET (Cambridge Boxhill Language Assessment)',
    profession: 'All professions',
    pages: 24,
    description:
      'Full official Listening sample: Part A (2 consultations), Part B (6 extracts), Part C (2 presentations). Full MP3 via npm run import-audio.',
    pdfPath: '/pdfs/books/oet-listening-sample-test-1.pdf',
    tags: ['official', 'listening', 'sample test'],
  },
  {
    id: 'book-listening-2',
    title: 'Listening Sample Test 2 — Question Paper',
    author: 'OET (Cambridge Boxhill Language Assessment)',
    profession: 'All professions',
    pages: 24,
    description:
      'Second official Listening sample test pack. Full MP3 via npm run import-audio — use under timed conditions alongside Sample Test 1 for variety.',
    pdfPath: '/pdfs/books/oet-listening-sample-test-2.pdf',
    tags: ['official', 'listening', 'sample test'],
  },
  {
    id: 'book-listening-3',
    title: 'Listening Sample Test 3 — Question Paper',
    author: 'OET (Cambridge Boxhill Language Assessment)',
    profession: 'All professions',
    pages: 24,
    description:
      'Third official Listening sample test. Full MP3 downloads via npm run import-audio — play under timed conditions with this question paper.',
    pdfPath: '/pdfs/books/oet-listening-sample-test-3.pdf',
    tags: ['official', 'listening', 'sample test'],
  },
  {
    id: 'book-graded-speaking',
    title: 'Graded Candidate Samples — Speaking Booklet',
    author: 'OET (Cambridge Boxhill Language Assessment)',
    profession: 'All professions',
    pages: 90,
    description:
      'Real candidate speaking performances across Dentistry, Medicine, Nursing, Pharmacy, Physiotherapy, and more — with assessor scoring rationale.',
    pdfPath: '/pdfs/books/oet-graded-speaking-samples.pdf',
    tags: ['official', 'speaking', 'graded samples'],
  },
  {
    id: 'book-graded-writing',
    title: 'Graded Candidate Samples — Writing Booklet',
    author: 'OET (Cambridge Boxhill Language Assessment)',
    profession: 'All professions',
    pages: 48,
    description:
      'Annotated writing samples showing how examiners apply criteria. Includes Nursing graded letters at multiple band levels.',
    pdfPath: '/pdfs/books/oet-graded-writing-samples.pdf',
    tags: ['official', 'writing', 'graded samples'],
  },
  {
    id: 'book-nursing-writing-01',
    title: 'Nursing Writing Sample Task 01',
    author: 'OET (Cambridge Boxhill Language Assessment)',
    profession: 'Nursing',
    pages: 4,
    description:
      'Official nursing writing task with case notes, task instructions, and a model sample response letter.',
    pdfPath: '/pdfs/books/oet-nursing-writing-sample-task-01.pdf',
    tags: ['official', 'nursing', 'writing'],
  },
  {
    id: 'book-nursing-writing-02',
    title: 'Nursing Writing Sample Task 02 — Community Transfer',
    author: 'OET (Cambridge Boxhill Language Assessment)',
    profession: 'Nursing',
    pages: 4,
    description:
      'Official task: transfer letter to Community Health Nurse for Mr Peter Dunbar (diabetes, compliance, cardiac history) with model answer.',
    pdfPath: '/pdfs/books/oet-nursing-writing-sample-task-02.pdf',
    tags: ['official', 'nursing', 'writing'],
  },
];
