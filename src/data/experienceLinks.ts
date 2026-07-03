/** Maps exam experience IDs to related experience PDF catalog IDs. */
export const experiencePdfLinks: Record<string, string> = {
  'exp-1': 'exp-pdf-1',
  'exp-2': 'exp-pdf-2',
  'exp-3': 'exp-pdf-3',
  'exp-4': 'exp-pdf-4',
  'exp-5': 'exp-pdf-5',
  'exp-6': 'exp-pdf-7',
  'exp-7': 'exp-pdf-8',
  'exp-8': 'exp-pdf-9',
  'exp-9': 'exp-pdf-10',
  'exp-10': 'exp-pdf-11',
  'exp-11': 'exp-pdf-12',
  'exp-12': 'exp-pdf-13',
};

export function getRelatedPdfId(experienceId: string): string | undefined {
  return experiencePdfLinks[experienceId];
}
