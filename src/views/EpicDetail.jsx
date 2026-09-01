import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { PartnerAvatar } from '../components/ui/PartnerAvatar'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { TaskModal } from './TaskModal'
import { ProgressBar } from '../components/ui/ProgressBar'
import { scoreTask } from '../lib/scoring'
import { progressOf, isMissedDeadline } from '../lib/deadlines'

export function EpicDetail({ appData }) {
  const { epicId } = useParams()
  const { epics, milestones, projects, tasks, partners, rollup, addTask, updateTask, deleteTask } = appData

  const epic = epics.find(e => e.id === epicId)
  const milestone = epic ? milestones.find(m => m.id === epic.milestoneId) : null
  const project = milestone ? projects.find(p => p.id === milestone.projectId) : null
  const myTasks = tasks.filter(t => t.epicId === epicId)
  const er = rollup.epicRollup[epicId] ?? { points: 0, pointsByPartner: {} }

  // modal: { mode: 'add' | 'edit' | 'copy', initial: task-shaped object | null }
  const [modal, setModal] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  if (!epic) return (
    <div className="p-6 text-center" style={{ color: 'var(--text-sec)' }}>
      Epic not found.
    </div>
  )

  const openAdd = () => setModal({ mode: 'add', initial: null })
  const openEdit = (t) => setModal({ mode: 'edit', initial: t })
  const openCopy = (t) => setModal({
    mode: 'copy',
    initial: {
      title: `${t.title} (copy)`,
      description: t.description,
      stream: t.stream,
      status: 'backlog',
      effortPoints: t.effortPoints,
      complexityBand: t.complexityBand,
      impactTier: t.impactTier,
      contributors: (t.contributors ?? []).map(c => ({ ...c })),
      // no id / completedAt / deadline — the copy starts fresh
    },
  })

  const handleSaveTask = (data) => {
    if (modal?.mode === 'edit') return updateTask({ ...modal.initial, ...data }, modal.initial.epicId)
    return addTask(data)
  }

  const statusOrder = { backlog: 0, in_progress: 1, done: 2, blocked: 3 }
  const sorted = [...myTasks].sort((a, b) => (statusOrder[a.status] ?? 4) - (statusOrder[b.status] ?? 4))

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-2 text-sm" style={{ color: 'var(--text-sec)' }}>
        <Link to="/projects" style={{ color: 'var(--sky-blue)' }}>Projects</Link>
        {' / '}
        <Link to={`/projects/${project?.id}`} style={{ color: 'var(--sky-blue)' }}>{project?.name}</Link>
        {' / '}
        <Link to={`/milestones/${milestone?.id}`} style={{ color: 'var(--sky-blue)' }}>{milestone?.label}</Link>
        {' / '}{epic.name}
      </div>

      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-pri)' }}>{epic.name}</h1>
          {epic.description && <p className="mt-1 text-sm" style={{ color: 'var(--text-sec)' }}>{epic.description}</p>}
          <div className="flex gap-3 mt-2">
            <Badge status={epic.status} />
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-border)', color: 'var(--text-sec)' }}>
              {epic.primaryStream}
            </span>
            <span className="text-sm font-mono" style={{ color: 'var(--sky-blue)' }}>{er.points.toFixed(1)} pts (completed)</span>
          </div>
          {myTasks.length > 0 && (
            <div className="mt-3 max-w-sm">
              <ProgressBar {...progressOf(myTasks)} flagged={myTasks.filter(isMissedDeadline).length} />
            </div>
          )}
        </div>
        <Button onClick={openAdd} size="sm">+ Add Task</Button>
      </div>

      {/* Partner breakdown */}
      {Object.keys(er.pointsByPartner).length > 0 && (
        <Card className="mb-4">
          <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--text-sec)' }}>Partner Credits</h3>
          <div className="flex gap-4 flex-wrap">
            {Object.entries(er.pointsByPartner).map(([pid, pts]) => {
              const p = partners.find(x => x.id === pid)
              return (
                <div key={pid} className="flex items-center gap-2">
                  <PartnerAvatar partner={p} size="sm" />
                  <span className="text-sm" style={{ color: 'var(--text-pri)' }}>
                    {p?.name ?? pid}: <span style={{ color: 'var(--sky-blue)' }}>{pts.toFixed(1)}</span>
                  </span>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {myTasks.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-3xl mb-2">✅</p>
          <p className="font-medium mb-1" style={{ color: 'var(--text-pri)' }}>No tasks yet</p>
          <p className="text-sm mb-4" style={{ color: 'var(--text-sec)' }}>Add tasks to this epic. Tasks are the scored unit.</p>
          <Button onClick={openAdd} size="sm">Add First Task</Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {sorted.map(t => {
            const score = scoreTask(t, { impactCap: 3 })
            return (
              <Card key={t.id} style={{ padding: '12px' }}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge status={t.status} />
                      <span className="text-sm font-medium truncate" style={{ color: 'var(--text-pri)' }}>{t.title}</span>
                    </div>
                    {t.description && (
                      <p className="text-xs mb-2 line-clamp-1" style={{ color: 'var(--text-sec)' }}>{t.description}</p>
                    )}
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs font-mono" style={{ color: 'var(--accent-orng)' }}>
                        {t.effortPoints}×{t.complexityBand}×{t.impactTier} = {score} pts
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-border)', color: 'var(--text-sec)' }}>
                        {t.stream}
                      </span>
                      <div className="flex gap-1">
                        {(t.contributors ?? []).map(c => {
                          const p = partners.find(x => x.id === c.partnerId)
                          return (
                            <div key={c.partnerId} className="flex items-center gap-1">
                              <PartnerAvatar partner={p} size="sm" />
                              <span className="text-xs" style={{ color: 'var(--text-sec)' }}>{(c.weight * 100).toFixed(0)}%</span>
                            </div>
                          )
                        })}
                      </div>
                      {t.deadline && (
                        <span className="text-xs" style={{ color: isMissedDeadline(t) ? 'var(--danger-red)' : 'var(--text-sec)' }}>
                          ⏰ {t.deadline.slice(0, 10)}
                        </span>
                      )}
                      {t.completedAt && (
                        <span className="text-xs" style={{ color: 'var(--text-sec)' }}>✓ {t.completedAt.slice(0, 10)}</span>
                      )}
                      {isMissedDeadline(t) && (
                        <span className="text-xs font-medium" style={{ color: 'var(--danger-red)' }}>
                          ⚑ {t.status === 'done' ? 'late' : 'missed deadline'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => openCopy(t)}>Copy</Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(t)}>Edit</Button>
                    <Button variant="danger" size="sm" onClick={() => setDeleteTarget(t)}>Del</Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <TaskModal
        open={!!modal}
        onClose={() => setModal(null)}
        epicId={epicId}
        partners={partners}
        initial={modal?.initial ?? null}
        mode={modal?.mode}
        onSave={handleSaveTask}
        defaultStream={epic.primaryStream}
        projects={projects}
        milestones={milestones}
        epics={epics}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTask(deleteTarget)}
        title="Delete Task"
        message={`Delete "${deleteTarget?.title}"? This cannot be undone.`}
      />
    </div>
  )
}
