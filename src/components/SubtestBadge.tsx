import type { SubtestType } from '../types';

const labels: Record<string, string> = {
  listening: 'Listening',
  reading: 'Reading',
  writing: 'Writing',
  speaking: 'Speaking',
  usmle: 'USMLE',
};

const colors: Record<string, string> = {
  listening: 'badge-listening',
  reading: 'badge-reading',
  writing: 'badge-writing',
  speaking: 'badge-speaking',
  usmle: 'badge-usmle',
};

interface Props {
  subtest: SubtestType | 'general';
  small?: boolean;
}

export function SubtestBadge({ subtest, small }: Props) {
  if (subtest === 'general') {
    return <span className={`badge badge-general ${small ? 'badge-sm' : ''}`}>General</span>;
  }
  return (
    <span className={`badge ${colors[subtest] ?? 'badge-listening'} ${small ? 'badge-sm' : ''}`}>
      {labels[subtest] ?? subtest}
    </span>
  );
}
