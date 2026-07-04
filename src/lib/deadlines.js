import { DUE_SOON_DAYS } from './constants'

const MS_DAY = 86400000

// Full days until end of the deadline day (local): today → 0, yesterday → -1
export function daysUntil(deadlineIso) {
  const endOfDay = new Date(deadlineIso.slice(0, 10) + 'T23:59:59')
  return Math.floor((endOfDay.getTime() - Date.now()) / MS_DAY)
}

// 'overdue' | 'due_soon' | 'none' — drives the pulse highlighting
export function deadlineState(task) {
  if (!task.deadline || task.status === 'done') return 'none'
  const days = daysUntil(task.deadline)
  if (days < 0) return 'overdue'
  if (days <= DUE_SOON_DAYS) return 'due_soon'
  return 'none'
}

// Done task delivered after its deadline (date granularity — on the day is on time)
export function completedLate(task) {
  if (task.status !== 'done' || !task.deadline || !task.completedAt) return false
  return task.completedAt.slice(0, 10) > task.deadline.slice(0, 10)
}

// Red flag ⚑: open task past its deadline, or done task completed late
export function isMissedDeadline(task) {
  return deadlineState(task) === 'overdue' || completedLate(task)
}

// Count-based completion progress for a list of tasks
export function progressOf(tasks) {
  const total = tasks.length
  const done = tasks.filter(t => t.status === 'done').length
  return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 }
}
