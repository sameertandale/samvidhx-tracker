import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { Badge } from '../components/ui/Badge'
import { PartnerAvatar } from '../components/ui/PartnerAvatar'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Spinner } from '../components/ui/Spinner'
import { ProgressBar } from '../components/ui/ProgressBar'
import { TaskCsvImportModal } from '../components/TaskCsvImportModal'
import { MILESTONE_STATUSES } from '../lib/constants'
import { progressOf, isMissedDeadline } from '../lib/deadlines'
import { exportProjectTasksCsv } from '../lib/csv'

function MilestoneForm({ initial, projectId, onSave, onClose }) {
  const [form, setForm] = useState({
    label: initial?.label ?? '',
    description: initial?.description ?? '',
    status: initial?.status ?? 'planned',
    targetDate: initial?.targetDate ?? '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.label.trim()) return
    setSaving(true)
    await onSave({
      ...(initial ?? {}),
      projectId,
      label: form.label.trim(),
      description: form.description.trim(),
      status: form.status,
      targetDate: form.targetDate || null,
    })
    setSaving(false)
    onClose()
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm mb-1" style={{ color: 'var(--text-sec)' }}>Label *</label>
        <input
          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-pri)' }}
          value={form.label}
          onChange={e => set('label', e.target.value)}
          placeholder="e.g. Milestone 1, v1.0, Pilot Batch"
        />
      </div>
      <div>
        <label className="block text-sm mb-1" style={{ color: 'var(--text-sec)' }}>Description / Acceptance Criteria</label>
        <textarea rows={3}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
          style={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-pri)' }}
          value={form.description}
          onChange={e => set('description', e.target.value)}
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
            {MILESTONE_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1" style={{ color: 'var(--text-sec)' }}>Target Date</label>
          <input type="date"
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-pri)' }}
            value={form.targetDate}
            onChange={e => set('targetDate', e.target.value)}
          />
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <Button variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
        <Button onClick={handleSave} disabled={!form.label.trim() || saving} className="flex-1">
          {saving ? <Spinner size="sm" /> : (initial ? 'Save' : 'Add Milestone')}
        </Button>
      </div>
    </div>
  )
}

export function ProjectDetail({ appData }) {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { projects, milestones, epics, tasks, partners, rollup, addMilestone, updateMilestone, deleteMilestone, addTask, updateTask } = appData

  const project = projects.find(p => p.id === projectId)
  const myMilestones = milestones.filter(m => m.projectId === projectId)
  const pr = rollup.projectRollup[projectId] ?? { points: 0, pointsByPartner: {} }

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [importOpen, setImportOpen] = useState(false)

  if (!project) return (
    <div className="p-6 text-center" style={{ color: 'var(--text-sec)' }}>
      Project not found. <Link to="/projects" style={{ color: 'var(--sky-blue)' }}>Back to Projects</Link>
    </div>
  )

  const openAdd = () => { setEditing(null); setModalOpen(true) }
  const openEdit = (e, m) => { e.stopPropagation(); setEditing(m); setModalOpen(true) }
  const handleSave = (data) => editing ? updateMilestone({ ...editing, ...data }) : addMilestone(data)

  const handleExportCsv = () => {
    const csv = exportProjectTasksCsv(project, milestones, epics, tasks, partners)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-tasks.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-2 text-sm" style={{ color: 'var(--text-sec)' }}>
        <Link to="/projects" style={{ color: 'var(--sky-blue)' }}>Projects</Link> / {project.name}
      </div>

      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-pri)' }}>{project.name}</h1>
          {project.description && <p className="mt-1 text-sm" style={{ color: 'var(--text-sec)' }}>{project.description}</p>}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleExportCsv}>Export CSV</Button>
          <Button variant="ghost" size="sm" onClick={() => setImportOpen(true)}>Import CSV</Button>
          <Badge status={project.status} />
        </div>
      </div>

      {/* Partner breakdown */}
      {Object.keys(pr.pointsByPartner).length > 0 && (
        <Card className="mb-6">
          <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-sec)' }}>Partner Points (all time)</h3>
          <div className="flex gap-4 flex-wrap">
            {Object.entries(pr.pointsByPartner).map(([pid, pts]) => {
              const p = partners.find(x => x.id === pid)
              return (
                <div key={pid} className="flex items-center gap-2">
                  <PartnerAvatar partner={p} size="sm" />
                  <span className="text-sm" style={{ color: 'var(--text-pri)' }}>
                    {p?.name ?? pid}: <span style={{ color: 'var(--sky-blue)' }}>{pts.toFixed(1)} pts</span>
                  </span>
                </div>
              )
            })}
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--text-sec)' }}>Total: {pr.points.toFixed(1)} pts</p>
        </Card>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-pri)' }}>Milestones</h2>
        <Button onClick={openAdd} size="sm">+ Add Milestone</Button>
      </div>

      {myMilestones.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-3xl mb-2">🏁</p>
          <p className="font-medium mb-1" style={{ color: 'var(--text-pri)' }}>No milestones yet</p>
          <p className="text-sm mb-4" style={{ color: 'var(--text-sec)' }}>Add a milestone to organise epics and tasks.</p>
          <Button onClick={openAdd} size="sm">Add First Milestone</Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {myMilestones.map(m => {
            const mr = rollup.milestoneRollup[m.id] ?? { points: 0 }
            const mEpicIds = epics.filter(e => e.milestoneId === m.id).map(e => e.id)
            const mTasks = tasks.filter(t => mEpicIds.includes(t.epicId))
            return (
              <Card key={m.id} onClick={() => navigate(`/milestones/${m.id}`)} className="hover:border-[var(--accent-blue)] transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge status={m.status} />
                    <span className="font-medium" style={{ color: 'var(--text-pri)' }}>{m.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono" style={{ color: 'var(--sky-blue)' }}>{mr.points.toFixed(1)} pts</span>
                    {m.targetDate && <span className="text-xs" style={{ color: 'var(--text-sec)' }}>{m.targetDate}</span>}
                    <Button variant="ghost" size="sm" onClick={e => openEdit(e, m)}>Edit</Button>
                    <Button variant="danger" size="sm" onClick={e => { e.stopPropagation(); setDeleteTarget(m) }}>Delete</Button>
                  </div>
                </div>
                {m.description && (
                  <p className="mt-2 text-sm" style={{ color: 'var(--text-sec)' }}>{m.description}</p>
                )}
                {mTasks.length > 0 && (
                  <div className="mt-3">
                    <ProgressBar {...progressOf(mTasks)} flagged={mTasks.filter(isMissedDeadline).length} />
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Milestone' : 'Add Milestone'}>
        <MilestoneForm initial={editing} projectId={projectId} onSave={handleSave} onClose={() => setModalOpen(false)} />
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMilestone(deleteTarget.id)}
        title="Delete Milestone"
        message={`Delete "${deleteTarget?.label}"? All its epics and tasks will be permanently removed.`}
      />

      <TaskCsvImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        project={project}
        milestones={milestones}
        epics={epics}
        tasks={tasks}
        partners={partners}
        addTask={addTask}
        updateTask={updateTask}
      />
    </div>
  )
}
