// Preserve unknown fields and IDs from legacy backups; normalize only known aliases.
export function normalizeTasks(value) {
  if (!Array.isArray(value)) return [];
  return value.map(task => ({ ...task, status: task.status === 'in-progress' ? 'in_progress' : task.status }));
}
