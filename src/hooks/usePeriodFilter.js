export function usePeriodFilter(tasks, period) {
  if (!period) return tasks
  return tasks.filter(t => {
    if (!t.completedAt) return false
    const d = t.completedAt.slice(0, 10)
    return d >= period.start && d <= period.end
  })
}
