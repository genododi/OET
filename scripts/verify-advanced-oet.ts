import { mockExams } from '../src/data/mockExams';
import { practiceModules } from '../src/data/practice';
import { bankBySubtest } from '../src/data/sessionTaskBank';

const catalogFailures = [
  ...practiceModules.map((module) => `practice:${module.id}:${module.difficulty}`),
  ...mockExams.map((exam) => `mock:${exam.id}:${exam.difficulty}`),
].filter((entry) => !entry.endsWith(':advanced'));

const taskFailures = Object.entries(bankBySubtest).flatMap(([subtest, tasks]) =>
  tasks
    .filter((task) => task.difficulty !== 'advanced')
    .map((task) => `task:${subtest}:${task.id}:${task.difficulty ?? 'unset'}`),
);

const failures = [...catalogFailures, ...taskFailures];

if (failures.length > 0) {
  throw new Error(`Advanced-only OET policy failed:\n${failures.join('\n')}`);
}

console.log(
  `Advanced-only policy verified: ${practiceModules.length} practice modules, ${mockExams.length} mocks, ${Object.values(bankBySubtest).flat().length} live tasks.`,
);
