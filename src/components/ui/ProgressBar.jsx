export function ProgressBar({ done, total, pct, size = 'md', flagged = 0 }) {
  if (total === 0) return null
  const height = size === 'sm' ? 4 : 6
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-border)', height }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: pct === 100 ? 'var(--success-green)' : 'var(--accent-blue)' }}
        />
      </div>
      <span className="text-xs font-mono flex-shrink-0" style={{ color: pct === 100 ? 'var(--success-green)' : 'var(--text-sec)' }}>
        {done}/{total} · {pct}%
      </span>
      {flagged > 0 && (
        <span className="text-xs flex-shrink-0" style={{ color: 'var(--danger-red)' }} title={`${flagged} task(s) missed deadline`}>
          ⚑ {flagged}
        </span>
      )}
    </div>
  )
}
