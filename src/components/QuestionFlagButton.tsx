interface Props {
  taskId: string;
  flagged: boolean;
  onToggle: (taskId: string) => void;
}

export function QuestionFlagButton({ taskId, flagged, onToggle }: Props) {
  return (
    <button
      type="button"
      className={`btn btn-ghost btn-sm question-flag-btn ${flagged ? 'question-flagged' : ''}`}
      onClick={() => onToggle(taskId)}
      aria-label={flagged ? 'Unmark question' : 'Mark question for review'}
    >
      {flagged ? '⚑ Flagged' : '⚐ Flag'}
    </button>
  );
}
