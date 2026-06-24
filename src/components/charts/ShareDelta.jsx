import { PartnerAvatar } from '../ui/PartnerAvatar'

export function ShareDelta({ partners, suggestedShare }) {
  const active = partners.filter(p => p.active !== false)
  if (active.length === 0) return null

  return (
    <div className="space-y-3">
      {active.map(p => {
        const suggested = suggestedShare[p.id] ?? 0
        const current = p.currentShare ?? 0
        const delta = suggested - current

        return (
          <div key={p.id} className="flex items-center gap-3">
            <PartnerAvatar partner={p} size="sm" />
            <span className="w-24 truncate text-sm" style={{ color: 'var(--text-pri)' }}>{p.name}</span>
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-border)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${Math.min(suggested, 100)}%`, backgroundColor: p.color ?? '#1564F9' }}
                />
              </div>
              <span className="text-sm font-mono w-14 text-right" style={{ color: 'var(--text-pri)' }}>
                {suggested.toFixed(1)}%
              </span>
              {current > 0 && (
                <span
                  className="text-xs font-mono w-14 text-right"
                  style={{ color: delta > 0 ? '#4ADE80' : delta < 0 ? '#F87171' : 'var(--text-sec)' }}
                >
                  {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
