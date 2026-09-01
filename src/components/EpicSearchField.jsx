import { useState, useEffect } from 'react'

export function epicBreadcrumb(epicId, { epics, milestones, projects }) {
  const epic = epics.find(e => e.id === epicId)
  if (!epic) return ''
  const milestone = milestones.find(m => m.id === epic.milestoneId)
  const project = milestone ? projects.find(p => p.id === milestone.projectId) : null
  return [project?.name, milestone?.label, epic.name].filter(Boolean).join(' ▸ ')
}

// Searchable epic picker: type to filter by epic name, shows Project ▸ Milestone ▸ Epic breadcrumb.
export function EpicSearchField({ epics, milestones, projects, value, onChange }) {
  const [query, setQuery] = useState(() => epicBreadcrumb(value, { epics, milestones, projects }))
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setQuery(epicBreadcrumb(value, { epics, milestones, projects }))
  }, [value]) // eslint-disable-line

  const q = query.trim().toLowerCase()
  const matches = open
    ? epics
        .map(e => ({ epic: e, label: epicBreadcrumb(e.id, { epics, milestones, projects }) }))
        .filter(({ epic, label }) => !q || epic.name.toLowerCase().includes(q) || label.toLowerCase().includes(q))
        .slice(0, 8)
    : []

  return (
    <div className="relative">
      <input
        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
        style={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-pri)' }}
        value={query}
        placeholder="Search epic name…"
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && (
        <div
          className="absolute z-10 mt-1 w-full rounded-lg max-h-56 overflow-y-auto"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}
        >
          {matches.length === 0 ? (
            <div className="px-3 py-2 text-sm" style={{ color: 'var(--text-sec)' }}>
              No epics match "{query}"
            </div>
          ) : (
            matches.map(({ epic, label }) => (
              <button
                key={epic.id}
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:opacity-80 truncate block"
                style={{ color: epic.id === value ? 'var(--sky-blue)' : 'var(--text-pri)' }}
                onMouseDown={e => e.preventDefault()}
                onClick={() => { onChange(epic.id); setQuery(label); setOpen(false) }}
              >
                {label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
