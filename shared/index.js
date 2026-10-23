// Main entry point - exports all shared utilities
export * from './lib/auth.js'
export * from './lib/gamification.js'
export * from './lib/tokenSystem.js'
export * from './lib/premium.js'
export * from './lib/supabaseClient.js'
export * from './lib/cloudAuth.js'
export * from './lib/helpers.js'
export * from './lib/notifications.js'
export * from './lib/backup.js'
export * from './lib/cloudSync.js'
export * from './lib/dictionaries.js'
export * from './lib/language.js'
export * from './lib/roast.js'
export * from './lib/sounds.js'
export * from './lib/storage.js'
export * from './lib/insights.js'
export {
  GOAL_SCHEMA_VERSION,
  GOAL_TYPES,
  NUMERIC_GOAL_TYPES,
  GOAL_STATUSES,
  GOAL_CHECKPOINTS,
  GOAL_TYPE_INFO,
  GOAL_UNITS,
  GOAL_SOURCES,
  GOAL_TEMPLATES,
  toLocalDate,
  daysBetween,
  addDays,
  addMonths,
  weekKey,
  startOfWeek,
  parseGoalAmount,
  getGoalUnit,
  formatGoalValue,
  formatCompactValue,
  isLinkedGoal,
  migrateGoal,
  migrateGoals,
  createGoal,
  buildSourceEvents,
  getGoalEvents,
  getGoalSeries,
  getGoalSnapshot,
  withCachedProgress,
  pendingCelebrations,
  addGoalEntry,
  removeGoalEntry,
  toggleGoalMilestone,
  setGoalStatus,
  markCelebrated,
  saveGoalReview,
  getWeeklyQuota,
  getRecoveryOptions,
  simulateGoal,
  getJourneyStops,
  pickNextGoalAction,
  sortGoals,
  averageMonthlyExpense,
  goalFromTemplate,
  inferGoalFromTitle,
} from './lib/goals.js'
