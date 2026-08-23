import type {
  OetSubtest,
  StudyResource,
  StudyResourceFormat,
} from '../types';

export const studyResources: StudyResource[] = [
  {
    id: 'resource-oet-ready-guide',
    title: 'OET Ready Study Guide',
    description: 'Official preparation roadmap covering the four sub-tests and a structured approach to practice.',
    profession: 'Medicine',
    subtest: 'general',
    format: 'guide',
    difficulty: 'all',
    sourceLabel: 'Official OET',
    sourceUrl: 'https://oet.com/learn',
    sourceContainer: 'official-oet',
    redistributionStatus: 'official-public',
    publicationEligible: true,
    localPath: '/pdfs/books/oet-ready-study-guide.pdf',
    tags: ['official', 'study plan', 'overview'],
  },
  {
    id: 'resource-writing-guide',
    title: 'The Ultimate Guide to OET Writing',
    description: 'Official explanation of purpose, content, clarity, genre, organisation, and language criteria.',
    profession: 'Medicine',
    subtest: 'writing',
    format: 'guide',
    difficulty: 'advanced',
    sourceLabel: 'Official OET',
    sourceUrl: 'https://oet.com/learn/writing',
    sourceContainer: 'official-oet',
    redistributionStatus: 'official-public',
    publicationEligible: true,
    localPath: '/pdfs/books/oet-ultimate-writing-guide.pdf',
    tags: ['official', 'rubric', 'medicine writing'],
  },
  ...[1, 2, 3].map((number): StudyResource => ({
    id: `resource-listening-sample-${number}`,
    title: `Listening Sample Test ${number}`,
    description: 'Official full-format listening question paper for timed practice with the matching recording.',
    profession: 'Medicine',
    subtest: 'listening',
    format: 'sample-test',
    difficulty: 'advanced',
    sourceLabel: 'Official OET',
    sourceUrl: 'https://oet.com/ready/sample-tests',
    sourceContainer: 'official-oet',
    redistributionStatus: 'official-public',
    publicationEligible: true,
    localPath: `/pdfs/books/oet-listening-sample-test-${number}.pdf`,
    tags: ['official', 'timed', 'answer review'],
  })),
  {
    id: 'resource-speaking-masterclass',
    title: 'OET Speaking for Doctors - Sample Test Masterclass',
    description: 'Official 84-minute walkthrough with a Medicine role card, four candidate performances, feedback, and targeted communication tips.',
    profession: 'Medicine',
    subtest: 'speaking',
    format: 'video',
    difficulty: 'advanced',
    sourceLabel: 'Official OET YouTube',
    sourceUrl: 'https://www.youtube.com/watch?v=Wo1lSFRrg-I',
    sourceContainer: 'youtube',
    redistributionStatus: 'link-only',
    publicationEligible: true,
    tags: ['official', 'role-play', 'empathy', 'pronunciation'],
  },
  {
    id: 'resource-writing-by-letter-type',
    title: 'Writing Tasks by Letter Type and Specialty',
    description: 'Shared collection organised into referral, transfer, discharge, urgent, GP-to-GP, and allied-health folders. Linked for private study; files are not republished.',
    profession: 'Medicine',
    subtest: 'writing',
    format: 'reference',
    difficulty: 'advanced',
    sourceLabel: 'Shared Google Drive collection',
    sourceUrl: 'https://drive.google.com/drive/folders/1v2Bza1LzG_Bp5NrMYpZ54CLDp6C-xhu8',
    sourceContainer: 'google-drive',
    redistributionStatus: 'link-only',
    publicationEligible: true,
    tags: ['letter types', 'specialty', 'private archive'],
  },
  {
    id: 'resource-visal-collection',
    title: 'Dr. VisalW OET Collection',
    description: 'Shared listening, reading, speaking, writing, mock-test, and test-day folders. Linked as a source collection; rights-unclear binaries remain only in the private archive.',
    profession: 'Medicine',
    subtest: 'general',
    format: 'reference',
    difficulty: 'all',
    sourceLabel: 'Shared Google Drive collection',
    sourceUrl: 'https://drive.google.com/drive/folders/1NVdBFWSqnswl58pr96BVwTkH1ceT6P-j',
    sourceContainer: 'google-drive',
    redistributionStatus: 'link-only',
    publicationEligible: true,
    tags: ['collection', 'all sub-tests', 'private archive'],
  },
  {
    id: 'resource-oet-materials-index',
    title: 'OET Materials Index',
    description: 'Shared study-plan, official-exam, mini-mock, benchmark, corrections, tips, and word-list folders. Used as a provenance index, not mirrored in the public app.',
    profession: 'Medicine',
    subtest: 'general',
    format: 'reference',
    difficulty: 'all',
    sourceLabel: 'Shared Google Drive collection',
    sourceUrl: 'https://drive.google.com/drive/folders/10cvKcazYuaNe01cSahOSHbflbOlAEN0t',
    sourceContainer: 'google-drive',
    redistributionStatus: 'link-only',
    publicationEligible: true,
    tags: ['study plan', 'benchmark', 'corrections', 'private archive'],
  },
  {
    id: 'resource-telegram-important-materials-index',
    title: 'OET Important Materials — Source Index',
    description: 'Community channel inventoried for private source research. The public app links to the channel only; third-party files remain rights-unclear and are not republished.',
    profession: 'Medicine',
    subtest: 'general',
    format: 'reference',
    difficulty: 'all',
    sourceLabel: 'Telegram @OETimportantmaterials',
    sourceUrl: 'https://t.me/OETimportantmaterials',
    sourceContainer: 'telegram',
    redistributionStatus: 'link-only',
    publicationEligible: true,
    tags: ['community index', 'private archive', 'rights reviewed'],
  },
  {
    id: 'resource-facebook-oet4all-index',
    title: 'OET Study Group for All — File Index',
    description: 'Private-group file collection inventoried with member-authorised access. The public app republishes no group files or copied questions.',
    profession: 'Medicine',
    subtest: 'general',
    format: 'reference',
    difficulty: 'all',
    sourceLabel: 'Facebook OET study group for all',
    sourceUrl: 'https://www.facebook.com/groups/oet4all/files/files',
    sourceContainer: 'facebook',
    redistributionStatus: 'link-only',
    publicationEligible: true,
    tags: ['private group', 'source index', 'rights reviewed'],
  },
];

export interface StudyResourceFilters {
  query?: string;
  subtest?: OetSubtest | 'general' | 'all';
  format?: StudyResourceFormat | 'all';
  source?: 'official' | 'community' | 'all';
}

export function filterStudyResources(
  resources: readonly StudyResource[],
  filters: StudyResourceFilters,
): StudyResource[] {
  const query = filters.query?.trim().toLowerCase() ?? '';
  return resources.filter((resource) => {
    if (!resource.publicationEligible) return false;
    if (filters.subtest && filters.subtest !== 'all' && resource.subtest !== filters.subtest) return false;
    if (filters.format && filters.format !== 'all' && resource.format !== filters.format) return false;
    if (filters.source === 'official' && resource.sourceContainer !== 'official-oet' && resource.sourceContainer !== 'youtube') return false;
    if (filters.source === 'community' && (resource.sourceContainer === 'official-oet' || resource.sourceContainer === 'youtube')) return false;
    if (!query) return true;
    return [resource.title, resource.description, resource.sourceLabel, ...resource.tags]
      .join(' ')
      .toLowerCase()
      .includes(query);
  });
}
