const STATUS_STYLES = {
  // Task / Epic statuses
  backlog:     { bg: 'rgba(156,163,175,0.15)', color: '#9CA3AF', label: 'Backlog' },
  in_progress: { bg: 'rgba(21,100,249,0.15)',  color: '#60A5FA', label: 'In Progress' },
  done:        { bg: 'rgba(34,197,94,0.15)',   color: '#4ADE80', label: 'Done' },
  blocked:     { bg: 'rgba(239,68,68,0.15)',   color: '#F87171', label: 'Blocked' },
  // Project statuses
  active:      { bg: 'rgba(21,100,249,0.15)',  color: '#60A5FA', label: 'Active' },
  paused:      { bg: 'rgba(245,135,31,0.15)',  color: '#F5871F', label: 'Paused' },
  // Milestone statuses
  planned:     { bg: 'rgba(156,163,175,0.15)', color: '#9CA3AF', label: 'Planned' },
  shipped:     { bg: 'rgba(34,197,94,0.15)',   color: '#4ADE80', label: 'Shipped' },
  cancelled:   { bg: 'rgba(239,68,68,0.15)',   color: '#F87171', label: 'Cancelled' },
}

export function Badge({ status, label }) {
  const style = STATUS_STYLES[status] ?? { bg: 'rgba(156,163,175,0.15)', color: '#9CA3AF', label: status }
  const displayLabel = label ?? style.label

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: style.bg, color: style.color }}
    >
      {displayLabel}
    </span>
  )
}
