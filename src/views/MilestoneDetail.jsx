import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { Badge } from '../components/ui/Badge'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Spinner } from '../components/ui/Spinner'
import { STREAMS, EPIC_STATUSES } from '../lib/constants'

const KANBAN_COLS = [
  { status: 'backlog',     label: 'Backlog'      },
  { status: 'in_progress', label: 'In Progress'  },
  { status: 'done',        label: 'Done'          },
  { status: 'blocked',     label: 'Blocked'       },
]

function EpicForm({ initial, milestoneId, onSave, onClose }) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    primaryStream: initial?.primaryStream ?? 'execution',
    status: initial?.status ?? 'backlog',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    await onSave({
      ...(initial ?? {}),
      milestoneId,
      name: form.name.trim(),
      description: form.description.trim(),
      primaryStream: form.primaryStream,
      status: form.status,
    })
    setSaving(false)
    onClose()
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm mb-1" style={{ color: 'var(--text-sec)' }}>Epic Name *</label>
        <input
          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-pri)' }}
          value={form.name}
          onChange={e => set('name', e.target.value)}
          placeholder="e.g. Camera-based contamination mapping"
        />
      </div>
      <div>
        <label className="block text-sm mb-1" style={{ color: 'var(--text-sec)' }}>Description</label>
        <textarea rows={3}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
          style={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-pri)' }}
          value={form.description}
          onChange={e => set('description', e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1" style={{ color: 'var(--text-sec)' }}>Primary Stream</label>
          <select
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-pri)' }}
            value={form.primaryStream}
            onChange={e => set('primaryStream', e.target.value)}
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
            {EPIC_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <Button variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
        <Button onClick={handleSave} disabled={!form.name.trim() || saving} className="flex-1">
          {saving ? <Spinner size="sm" /> : (initial ? 'Save' : 'Add Epic')}
        </Button>
      </div>
    </div>
  )
}

export function MilestoneDetail({ appData }) {
  const { milestoneId } = useParams()
  const navigate = useNavigate()
  const { milestones, projects, epics, rollup, addEpic, updateEpic, deleteEpic } = appData

  const milestone = milestones.find(m => m.id === milestoneId)
  const project = milestone ? projects.find(p => p.id === milestone.projectId) : null
  const myEpics = epics.filter(e => e.milestoneId === milestoneId)
  const mr = rollup.milestoneRollup[milestoneId] ?? { points: 0 }

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  if (!milestone) return (
    <div className="p-6 text-center" style={{ color: 'var(--text-sec)' }}>
      Milestone not found.
    </div>
  )

  const openAdd = () => { setEditing(null); setModalOpen(true) }
  const openEdit = (e, epic) => { e.stopPropagation(); setEditing(epic); setModalOpen(true) }
  const handleSave = (data) => editing ? updateEpic({ ...editing, ...data }) : addEpic(data)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-2 text-sm" style={{ color: 'var(--text-sec)' }}>
        <Link to="/projects" style={{ color: 'var(--sky-blue)' }}>Projects</Link>
        {' / '}
        <Link to={`/projects/${project?.id}`} style={{ color: 'var(--sky-blue)' }}>{project?.name}</Link>
        {' / '}{milestone.label}
      </div>

      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-pri)' }}>{milestone.label}</h1>
          {milestone.description && <p className="mt-1 text-sm" style={{ color: 'var(--text-sec)' }}>{milestone.description}</p>}
          <div className="flex gap-3 mt-2">
            <Badge status={milestone.status} />
            {milestone.targetDate && <span className="text-xs" style={{ color: 'var(--text-sec)' }}>Target: {milestone.targetDate}</span>}
            <span className="text-xs font-mono" style={{ color: 'var(--sky-blue)' }}>{mr.points.toFixed(1)} pts</span>
          </div>
        </div>
        <Button onClick={openAdd} size="sm">+ Add Epic</Button>
      </div>

      {/* Kanban board */}
      {myEpics.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-3xl mb-2">📌</p>
          <p className="font-medium mb-1" style={{ color: 'var(--text-pri)' }}>No epics yet</p>
          <p className="text-sm mb-4" style={{ color: 'var(--text-sec)' }}>Add epics to organise the work in this milestone.</p>
          <Button onClick={openAdd} size="sm">Add First Epic</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {KANBAN_COLS.map(col => {
            const colEpics = myEpics.filter(e => e.status === col.status)
            return (
              <div key={col.status}>
                <div className="flex items-center gap-2 mb-3">
                  <Badge status={col.status} />
                  <span className="text-xs" style={{ color: 'var(--text-sec)' }}>{colEpics.length}</span>
                </div>
                <div className="space-y-2">
                  {colEpics.map(epic => {
                    const er = rollup.epicRollup[epic.id] ?? { points: 0 }
                    return (
                      <Card key={epic.id} onClick={() => navigate(`/epics/${epic.id}`)} className="hover:border-[var(--accent-blue)] transition-colors" style={{ padding: '12px' }}>
                        <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-pri)' }}>{epic.name}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-border)', color: 'var(--text-sec)' }}>
                            {epic.primaryStream}
                          </span>
                          <span className="text-xs font-mono" style={{ color: 'var(--sky-blue)' }}>{er.points.toFixed(1)} pts</span>
                        </div>
                        <div className="flex gap-1 mt-2" onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" onClick={e => openEdit(e, epic)} className="text-xs py-0.5 px-2">Edit</Button>
                          <Button variant="danger" size="sm" onClick={e => { e.stopPropagation(); setDeleteTarget(epic) }} className="text-xs py-0.5 px-2">Del</Button>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Epic' : 'Add Epic'}>
        <EpicForm initial={editing} milestoneId={milestoneId} onSave={handleSave} onClose={() => setModalOpen(false)} />
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteEpic(deleteTarget.id)}
        title="Delete Epic"
        message={`Delete "${deleteTarget?.name}"? All tasks in this epic will be permanently removed.`}
      />
    </div>
  )
}
