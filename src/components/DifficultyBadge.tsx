import type { Difficulty } from '../types';

const labels: Record<Difficulty, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

interface Props {
  difficulty: Difficulty;
}

export function DifficultyBadge({ difficulty }: Props) {
  return (
    <span className={`badge badge-difficulty badge-${difficulty}`}>
      {labels[difficulty]}
    </span>
  );
}
