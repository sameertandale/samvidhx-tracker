import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { Badge } from '../components/ui/Badge'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Spinner } from '../components/ui/Spinner'
import { PROJECT_STATUSES } from '../lib/constants'

function ProjectForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    status: initial?.status ?? 'active',
    startDate: initial?.startDate ?? new Date().toISOString().slice(0, 10),
    targetProfit: initial?.targetProfit ?? '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    await onSave({
      ...(initial ?? {}),
      name: form.name.trim(),
      description: form.description.trim(),
      status: form.status,
      startDate: form.startDate,
      targetProfit: form.targetProfit !== '' ? Number(form.targetProfit) : null,
    })
    setSaving(false)
    onClose()
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm mb-1" style={{ color: 'var(--text-sec)' }}>Project Name *</label>
        <input
          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-pri)' }}
          value={form.name}
          onChange={e => set('name', e.target.value)}
          placeholder="e.g. PanelCrystal, CatchPLC"
        />
      </div>
      <div>
        <label className="block text-sm mb-1" style={{ color: 'var(--text-sec)' }}>Description</label>
        <textarea
          rows={3}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
          style={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-pri)' }}
          value={form.description}
          onChange={e => set('description', e.target.value)}
          placeholder="What this project delivers…"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1" style={{ color: 'var(--text-sec)' }}>Status</label>
          <select
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-pri)' }}
            value={form.status}
            onChange={e => set('status', e.target.value)}
          >
            {PROJECT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1" style={{ color: 'var(--text-sec)' }}>Start Date</label>
          <input type="date"
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-pri)' }}
            value={form.startDate}
            onChange={e => set('startDate', e.target.value)}
          />
        </div>
      </div>
      <div>
        <label className="block text-sm mb-1" style={{ color: 'var(--text-sec)' }}>Target Profit ₹ (optional)</label>
        <input type="number" min="0"
          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-pri)' }}
          value={form.targetProfit}
          onChange={e => set('targetProfit', e.target.value)}
          placeholder="₹ target"
        />
      </div>
      <div className="flex gap-3 pt-2">
        <Button variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
        <Button onClick={handleSave} disabled={!form.name.trim() || saving} className="flex-1">
          {saving ? <Spinner size="sm" /> : (initial ? 'Save' : 'Create Project')}
        </Button>
      </div>
    </div>
  )
}

export function Projects({ appData }) {
  const navigate = useNavigate()
  const { projects, rollup, addProject, updateProject, deleteProject } = appData
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const openAdd = () => { setEditing(null); setModalOpen(true) }
  const openEdit = (e, p) => { e.stopPropagation(); setEditing(p); setModalOpen(true) }

  const handleSave = (data) => {
    if (editing) return updateProject({ ...editing, ...data })
    return addProject(data)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-pri)' }}>Projects</h1>
        <Button onClick={openAdd}>+ New Project</Button>
      </div>

      {projects.length === 0 ? (
        <Card className="text-center py-16">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-medium mb-1" style={{ color: 'var(--text-pri)' }}>No projects yet</p>
          <p className="text-sm mb-4" style={{ color: 'var(--text-sec)' }}>Create your first project to start tracking milestones and tasks.</p>
          <Button onClick={openAdd}>Create First Project</Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map(p => {
            const pr = rollup.projectRollup[p.id] ?? { points: 0 }
            return (
              <Card key={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="hover:border-[var(--accent-blue)] transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <h2 className="font-semibold text-base" style={{ color: 'var(--text-pri)' }}>{p.name}</h2>
                  <Badge status={p.status} />
                </div>
                {p.description && (
                  <p className="text-sm mb-3 line-clamp-2" style={{ color: 'var(--text-sec)' }}>{p.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono" style={{ color: 'var(--sky-blue)' }}>
                    {pr.points.toFixed(1)} pts
                  </span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={e => openEdit(e, p)}>Edit</Button>
                    <Button variant="danger" size="sm" onClick={e => { e.stopPropagation(); setDeleteTarget(p) }}>Delete</Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Project' : 'New Project'}>
        <ProjectForm initial={editing} onSave={handleSave} onClose={() => setModalOpen(false)} />
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteProject(deleteTarget.id)}
        title="Delete Project"
        message={`Delete "${deleteTarget?.name}"? This will permanently remove all its milestones, epics, and tasks.`}
      />
    </div>
  )
}
