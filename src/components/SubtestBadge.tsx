import type { OetSubtest } from '../types';

const labels: Record<OetSubtest, string> = {
  listening: 'Listening',
  reading: 'Reading',
  writing: 'Writing',
  speaking: 'Speaking',
};

const colors: Record<OetSubtest, string> = {
  listening: 'badge-listening',
  reading: 'badge-reading',
  writing: 'badge-writing',
  speaking: 'badge-speaking',
};

interface Props {
  subtest: OetSubtest | 'general';
  small?: boolean;
}

export function SubtestBadge({ subtest, small }: Props) {
  if (subtest === 'general') {
    return <span className={`badge badge-general ${small ? 'badge-sm' : ''}`}>General</span>;
  }
  return (
    <span className={`badge ${colors[subtest]} ${small ? 'badge-sm' : ''}`}>
      {labels[subtest]}
    </span>
  );
}
