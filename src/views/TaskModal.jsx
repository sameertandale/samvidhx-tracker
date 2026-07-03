import { useState, useEffect } from 'react'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { PartnerAvatar } from '../components/ui/PartnerAvatar'
import { Spinner } from '../components/ui/Spinner'
import { scoreTask } from '../lib/scoring'
import { FIBONACCI, COMPLEXITY_BANDS, IMPACT_TIERS, STREAMS, TASK_STATUSES } from '../lib/constants'

function ContributorRow({ partners, contributors, onChange }) {
  const availablePartners = partners.filter(p => !contributors.some(c => c.partnerId === p.id))
  const total = contributors.reduce((s, c) => s + c.weight, 0)
  const totalOk = Math.abs(total - 1.0) < 0.001

  const addContributor = () => {
    if (availablePartners.length === 0) return
    const newId = availablePartners[0].id
    const n = contributors.length + 1
    const equalWeight = +(1 / n).toFixed(3)
    // redistribute equally
    const updated = contributors.map(c => ({ ...c, weight: equalWeight }))
    const remainder = +(1 - equalWeight * (n - 1)).toFixed(3)
    onChange([...updated, { partnerId: newId, weight: remainder }])
  }

  const removeContributor = (idx) => {
    const next = contributors.filter((_, i) => i !== idx)
    if (next.length === 0) return
    // redistribute equally
    const eq = +(1 / next.length).toFixed(3)
    const remainder = +(1 - eq * (next.length - 1)).toFixed(3)
    onChange(next.map((c, i) => ({ ...c, weight: i < next.length - 1 ? eq : remainder })))
  }

  const changePartner = (idx, partnerId) => {
    onChange(contributors.map((c, i) => i === idx ? { ...c, partnerId } : c))
  }

  const changeWeight = (idx, raw) => {
    const w = Math.max(0, Math.min(1, parseFloat(raw) || 0))
    onChange(contributors.map((c, i) => i === idx ? { ...c, weight: +w.toFixed(3) } : c))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium" style={{ color: 'var(--text-sec)' }}>Contributors</label>
        <span className="text-xs" style={{ color: totalOk ? '#4ADE80' : '#F87171' }}>
          Weights sum: {total.toFixed(3)} {totalOk ? '✓' : '≠ 1.0'}
        </span>
      </div>
      <div className="space-y-2">
        {contributors.map((c, idx) => {
          const partner = partners.find(p => p.id === c.partnerId)
          const options = [{ id: c.partnerId, ...partner }, ...availablePartners].filter(Boolean)
          return (
            <div key={idx} className="flex items-center gap-2">
              <PartnerAvatar partner={partner} size="sm" />
              <select
                className="flex-1 px-2 py-1 rounded-lg text-sm outline-none"
                style={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-pri)' }}
                value={c.partnerId}
                onChange={e => changePartner(idx, e.target.value)}
              >
                {partners.map(p => (
                  <option key={p.id} value={p.id}
                    disabled={contributors.some((x, i) => i !== idx && x.partnerId === p.id)}>
                    {p.name}
                  </option>
                ))}
              </select>
              <input
                type="range" min="0" max="1" step="0.01"
                className="w-24"
                value={c.weight}
                onChange={e => changeWeight(idx, e.target.value)}
              />
              <span className="text-sm font-mono w-12 text-right" style={{ color: 'var(--text-pri)' }}>
                {(c.weight * 100).toFixed(0)}%
              </span>
              {contributors.length > 1 && (
                <button onClick={() => removeContributor(idx)} className="text-sm hover:opacity-70" style={{ color: '#F87171' }}>✕</button>
              )}
            </div>
          )
        })}
      </div>
      {availablePartners.length > 0 && (
        <button
          onClick={addContributor}
          className="mt-2 text-sm hover:opacity-80"
          style={{ color: 'var(--sky-blue)' }}
        >
          + Add contributor
        </button>
      )}
    </div>
  )
}

// mode: 'add' | 'edit' | 'copy'. When epicId is not given, projects/milestones/epics
// must be passed and the modal shows a cascading picker to place the task.
export function TaskModal({ open, onClose, epicId, partners, initial, onSave, defaultStream, mode, defaultContributorId, projects = [], milestones = [], epics = [] }) {
  const resolvedMode = mode ?? (initial ? 'edit' : 'add')
  const makeDefaultContributors = () => {
    if (defaultContributorId && partners.some(p => p.id === defaultContributorId)) {
      return [{ partnerId: defaultContributorId, weight: 1.0 }]
    }
    return partners.length > 0 ? [{ partnerId: partners[0].id, weight: 1.0 }] : []
  }

  const emptyForm = () => ({
    title: '',
    description: '',
    stream: defaultStream ?? 'execution',
    status: 'backlog',
    effortPoints: 3,
    complexityBand: 1,
    impactTier: 2,
    contributors: makeDefaultContributors(),
    estimatedAt: new Date().toISOString().slice(0, 10),
    completedAt: '',
    deadline: '',
  })

  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  // Cascading placement picker — only used when no epicId prop is given
  const [pick, setPick] = useState({ projectId: '', milestoneId: '', epicId: '' })

  useEffect(() => {
    if (open) {
      setPick({ projectId: '', milestoneId: '', epicId: '' })
      if (initial) {
        setForm({
          title: initial.title ?? '',
          description: initial.description ?? '',
          stream: initial.stream ?? defaultStream ?? 'execution',
          status: initial.status ?? 'backlog',
          effortPoints: initial.effortPoints ?? 3,
          complexityBand: initial.complexityBand ?? 1,
          impactTier: initial.impactTier ?? 2,
          contributors: initial.contributors?.length ? initial.contributors : makeDefaultContributors(),
          estimatedAt: initial.estimatedAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
          completedAt: initial.completedAt?.slice(0, 10) ?? '',
          deadline: initial.deadline?.slice(0, 10) ?? '',
        })
      } else {
        setForm(emptyForm())
      }
    }
  }, [open, initial]) // eslint-disable-line

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const total = form.contributors.reduce((s, c) => s + c.weight, 0)
  const weightsOk = Math.abs(total - 1.0) < 0.001
  const liveScore = scoreTask({ effortPoints: form.effortPoints, complexityBand: form.complexityBand, impactTier: form.impactTier }, { impactCap: 3 })

  const needsPicker = !epicId
  const pickMilestones = milestones.filter(m => m.projectId === pick.projectId)
  const pickEpics = epics.filter(e => e.milestoneId === pick.milestoneId)
  const targetEpicId = epicId ?? pick.epicId
  const epicOk = !!targetEpicId

  const handleSave = async () => {
    if (!form.title.trim() || !weightsOk || !epicOk) return
    setSaving(true)
    await onSave({
      ...(initial ?? {}),
      epicId: targetEpicId,
      title: form.title.trim(),
      description: form.description.trim(),
      stream: form.stream,
      status: form.status,
      effortPoints: Number(form.effortPoints),
      complexityBand: Number(form.complexityBand),
      impactTier: Number(form.impactTier),
      contributors: form.contributors,
      estimatedAt: form.estimatedAt ? form.estimatedAt + 'T00:00:00.000Z' : new Date().toISOString(),
      completedAt: form.completedAt ? form.completedAt + 'T00:00:00.000Z' : null,
      deadline: form.deadline ? form.deadline + 'T00:00:00.000Z' : null,
    })
    setSaving(false)
    onClose()
  }

  const titles = { add: 'Add Task', edit: 'Edit Task', copy: 'Copy Task' }
  const selectStyle = { backgroundColor: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-pri)' }

  return (
    <Modal open={open} onClose={onClose} title={titles[resolvedMode]} width="max-w-2xl">
      <div className="space-y-4">
        {needsPicker && (
          <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--bg-border)' }}>
            <label className="block text-sm mb-2 font-medium" style={{ color: 'var(--text-sec)' }}>Place task in *</label>
            <div className="grid grid-cols-3 gap-2">
              <select
                className="px-2 py-2 rounded-lg text-sm outline-none"
                style={selectStyle}
                value={pick.projectId}
                onChange={e => setPick({ projectId: e.target.value, milestoneId: '', epicId: '' })}
              >
                <option value="">Project…</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select
                className="px-2 py-2 rounded-lg text-sm outline-none"
                style={selectStyle}
                value={pick.milestoneId}
                disabled={!pick.projectId}
                onChange={e => setPick(pk => ({ ...pk, milestoneId: e.target.value, epicId: '' }))}
              >
                <option value="">Milestone…</option>
                {pickMilestones.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
              <select
                className="px-2 py-2 rounded-lg text-sm outline-none"
                style={selectStyle}
                value={pick.epicId}
                disabled={!pick.milestoneId}
                onChange={e => setPick(pk => ({ ...pk, epicId: e.target.value }))}
              >
                <option value="">Epic…</option>
                {pickEpics.map(ep => <option key={ep.id} value={ep.id}>{ep.name}</option>)}
              </select>
            </div>
            {pick.projectId && pick.milestoneId && pickEpics.length === 0 && (
              <p className="text-xs mt-2" style={{ color: 'var(--text-sec)' }}>This milestone has no epics yet — create one from its detail page first.</p>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm mb-1" style={{ color: 'var(--text-sec)' }}>Title *</label>
          <input
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-pri)' }}
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder="What needs to be done?"
          />
        </div>

        <div>
          <label className="block text-sm mb-1" style={{ color: 'var(--text-sec)' }}>Description</label>
          <textarea rows={2}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
            style={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-pri)' }}
            value={form.description}
            onChange={e => set('description', e.target.value)}
          />
        </div>

        {/* E × C × I selectors */}
        <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--bg-border)' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium" style={{ color: 'var(--text-sec)' }}>Score: E × C × I</span>
            <div className="text-right">
              <span className="text-xl font-bold" style={{ color: 'var(--accent-orng)' }}>{liveScore}</span>
              <span className="text-xs ml-1" style={{ color: 'var(--text-sec)' }}>pts</span>
              <div className="text-xs" style={{ color: 'var(--text-sec)' }}>
                {form.effortPoints} × {form.complexityBand} × {form.impactTier}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-sec)' }}>Effort (Fibonacci)</label>
              <div className="flex flex-wrap gap-1">
                {FIBONACCI.map(f => (
                  <button key={f}
                    className="w-8 h-8 rounded text-sm font-mono transition-colors"
                    style={{
                      backgroundColor: form.effortPoints === f ? 'var(--accent-blue)' : 'var(--bg-border)',
                      color: 'var(--text-pri)',
                    }}
                    onClick={() => set('effortPoints', f)}
                  >{f}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-sec)' }}>Complexity</label>
              <div className="space-y-1">
                {COMPLEXITY_BANDS.map(b => (
                  <button key={b.value}
                    className="w-full px-2 py-1 rounded text-xs transition-colors text-left"
                    style={{
                      backgroundColor: form.complexityBand === b.value ? 'var(--accent-blue)' : 'var(--bg-border)',
                      color: 'var(--text-pri)',
                    }}
                    onClick={() => set('complexityBand', b.value)}
                  >{b.label} ×{b.value}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-sec)' }}>Impact</label>
              <div className="space-y-1">
                {IMPACT_TIERS.map(t => (
                  <button key={t.value}
                    className="w-full px-2 py-1 rounded text-xs transition-colors text-left"
                    style={{
                      backgroundColor: form.impactTier === t.value ? 'var(--accent-orng)' : 'var(--bg-border)',
                      color: 'var(--text-pri)',
                    }}
                    onClick={() => set('impactTier', t.value)}
                  >{t.label} ×{t.value}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-sec)' }}>Stream</label>
            <select
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-pri)' }}
              value={form.stream}
              onChange={e => set('stream', e.target.value)}
            >
              {STREAMS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-sec)' }}>Status</label>
            <select
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-pri)' }}
              value={form.status}
              onChange={e => set('status', e.target.value)}
            >
              {TASK_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-sec)' }}>Deadline</label>
            <input type="date"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-pri)' }}
              value={form.deadline}
              onChange={e => set('deadline', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-sec)' }}>Estimated At</label>
            <input type="date"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-pri)' }}
              value={form.estimatedAt}
              onChange={e => set('estimatedAt', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-sec)' }}>Completed At</label>
            <input type="date"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-pri)' }}
              value={form.completedAt}
              onChange={e => set('completedAt', e.target.value)}
            />
          </div>
        </div>

        {partners.length > 0 && (
          <ContributorRow
            partners={partners}
            contributors={form.contributors}
            onChange={c => set('contributors', c)}
          />
        )}

        {!weightsOk && (
          <p className="text-xs" style={{ color: '#F87171' }}>
            Contributor weights must sum to exactly 1.0 before saving.
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSave} disabled={!form.title.trim() || !weightsOk || !epicOk || saving} className="flex-1">
            {saving ? <Spinner size="sm" /> : (resolvedMode === 'edit' ? 'Save Task' : 'Add Task')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
