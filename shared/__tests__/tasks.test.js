import { normalizeTasks } from '../lib/tasks';
test('web and mobile legacy status aliases render in the same column without duplicating IDs', () => {
  const tasks = normalizeTasks([{ id: 'old', status: 'in-progress', title: 'legacy' }, { id: 'new', status: 'in_progress' }, { id: 'done', status: 'done' }]);
  expect(tasks.filter(task => task.status === 'in_progress').map(task => task.id)).toEqual(['old', 'new']);
  expect(tasks[0].title).toBe('legacy');
  expect(normalizeTasks(tasks)).toEqual(tasks);
});
