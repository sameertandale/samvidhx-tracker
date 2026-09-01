import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { PartnerAvatar } from '../components/ui/PartnerAvatar'
import { TaskModal } from './TaskModal'
import { scoreTask } from '../lib/scoring'
import { daysUntil, deadlineState, completedLate } from '../lib/deadlines'

const PULSE_CLASS = { due_soon: 'pulse-due-soon', overdue: 'pulse-overdue', none: '' }

export function PartnerDetail({ appData }) {
  const { partnerId } = useParams()
  const { partners, projects, milestones, epics, tasks, addTask, updateTask } = appData
  // modal: { mode: 'add' } | { mode: 'edit', task } | null
  const [modal, setModal] = useState(null)

  const partner = partners.find(p => p.id === partnerId)

  if (!partner) return (
    <div className="p-6 text-center" style={{ color: 'var(--text-sec)' }}>
      Partner not found.
    </div>
  )

  const myTasks = tasks
    .filter(t => (t.contributors ?? []).some(c => c.partnerId === partnerId))
    .map(t => {
      const epic = epics.find(e => e.id === t.epicId)
      const milestone = epic ? milestones.find(m => m.id === epic.milestoneId) : null
      const project = milestone ? projects.find(p => p.id === milestone.projectId) : null
      const weight = (t.contributors ?? []).find(c => c.partnerId === partnerId)?.weight ?? 0
      const credit = scoreTask(t, { impactCap: 3 }) * weight
      return { task: t, epic, milestone, project, weight, credit, state: deadlineState(t) }
    })
    .sort((a, b) => {
      // deadline ascending, tasks without a deadline last
      if (a.task.deadline && b.task.deadline) return a.task.deadline.localeCompare(b.task.deadline)
      if (a.task.deadline) return -1
      if (b.task.deadline) return 1
      return (a.task.createdAt ?? '').localeCompare(b.task.createdAt ?? '')
    })

  const dueSoonCount = myTasks.filter(r => r.state === 'due_soon').length
  const overdueCount = myTasks.filter(r => r.state === 'overdue').length
  const doneCredit = myTasks.filter(r => r.task.status === 'done').reduce((s, r) => s + r.credit, 0)

  const handleSave = (data) => {
    if (modal?.mode === 'edit') return updateTask({ ...modal.task, ...data }, modal.task.epicId)
    return addTask(data)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-2 text-sm" style={{ color: 'var(--text-sec)' }}>
        <Link to="/partners" style={{ color: 'var(--sky-blue)' }}>Partners</Link>
        {' / '}{partner.name}
      </div>

      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <PartnerAvatar partner={partner} size="lg" />
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-pri)' }}>{partner.name}</h1>
            {partner.role && <p className="text-sm" style={{ color: 'var(--text-sec)' }}>{partner.role}</p>}
            <div className="flex gap-3 mt-1 flex-wrap text-xs" style={{ color: 'var(--text-sec)' }}>
              <span>{myTasks.length} task{myTasks.length === 1 ? '' : 's'}</span>
              {dueSoonCount > 0 && <span style={{ color: 'var(--accent-orng)' }}>{dueSoonCount} due soon</span>}
              {overdueCount > 0 && <span style={{ color: 'var(--danger-red)' }}>{overdueCount} overdue</span>}
              <span>Completed credit: <span className="font-mono" style={{ color: 'var(--sky-blue)' }}>{doneCredit.toFixed(1)} pts</span></span>
            </div>
          </div>
        </div>
        <Button onClick={() => setModal({ mode: 'add' })} size="sm">+ Add Task</Button>
      </div>

      {myTasks.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-3xl mb-2">📋</p>
          <p className="font-medium mb-1" style={{ color: 'var(--text-pri)' }}>No tasks yet</p>
          <p className="text-sm mb-4" style={{ color: 'var(--text-sec)' }}>Tasks where {partner.name} is a contributor will appear here, ordered by deadline.</p>
          <Button onClick={() => setModal({ mode: 'add' })} size="sm">Add First Task</Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {myTasks.map(({ task: t, epic, milestone, project, weight, credit, state }) => (
            <Card key={t.id} className={PULSE_CLASS[state]} style={{ padding: '12px' }}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge status={t.status} />
                    <span className="text-sm font-medium truncate" style={{ color: 'var(--text-pri)' }}>{t.title}</span>
                  </div>
                  <div className="text-xs mb-2 truncate" style={{ color: 'var(--text-sec)' }}>
                    {project && <Link to={`/projects/${project.id}`} style={{ color: 'var(--sky-blue)' }}>{project.name}</Link>}
                    {milestone && <>{' ▸ '}<Link to={`/milestones/${milestone.id}`} style={{ color: 'var(--sky-blue)' }}>{milestone.label}</Link></>}
                    {epic && <>{' ▸ '}<Link to={`/epics/${epic.id}`} style={{ color: 'var(--sky-blue)' }}>{epic.name}</Link></>}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-mono" style={{ color: 'var(--accent-orng)' }}>
                      {credit.toFixed(1)} pts ({(weight * 100).toFixed(0)}% of {scoreTask(t, { impactCap: 3 })})
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-border)', color: 'var(--text-sec)' }}>
                      {t.stream}
                    </span>
                    {t.deadline ? (
                      <span className="text-xs" style={{
                        color: state === 'overdue' ? 'var(--danger-red)'
                          : state === 'due_soon' ? 'var(--accent-orng)'
                          : 'var(--text-sec)',
                      }}>
                        ⏰ {t.deadline.slice(0, 10)}
                        {state === 'overdue' && ' · overdue'}
                        {state === 'due_soon' && ` · ${daysUntil(t.deadline)}d left`}
                      </span>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--text-sec)' }}>No deadline</span>
                    )}
                    {t.completedAt && (
                      <span className="text-xs" style={{ color: 'var(--text-sec)' }}>✓ {t.completedAt.slice(0, 10)}</span>
                    )}
                    {completedLate(t) && (
                      <span className="text-xs" style={{ color: 'var(--danger-red)' }}>⚑ late</span>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => setModal({ mode: 'edit', task: t })}>Edit</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <TaskModal
        open={!!modal}
        onClose={() => setModal(null)}
        epicId={modal?.mode === 'edit' ? modal.task.epicId : undefined}
        partners={partners}
        initial={modal?.mode === 'edit' ? modal.task : null}
        mode={modal?.mode}
        onSave={handleSave}
        defaultContributorId={partnerId}
        projects={projects}
        milestones={milestones}
        epics={epics}
      />
    </div>
  )
}
