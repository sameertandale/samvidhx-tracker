import { Link } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { PartnerAvatar } from '../components/ui/PartnerAvatar'
import { PartnerBar } from '../components/charts/PartnerBar'
import { ShareDelta } from '../components/charts/ShareDelta'
import { scoreTask, completedTotals } from '../lib/scoring'
import { completedLate } from '../lib/deadlines'
import { usePeriodFilter } from '../hooks/usePeriodFilter'

export function Dashboard({ appData }) {
  const { config, partners, projects, milestones, epics, tasks, rollup } = appData
  const period = config.currentPeriod

  // Tasks in-progress (pipeline) - separate from share calc
  const pipeline = tasks.filter(t => t.status === 'in_progress')

  // Active projects
  const activeProjects = projects.filter(p => p.status === 'active')

  const totalPoints = rollup.portfolioTotal

  // All-time credit from completed tasks — independent of the review period and
  // of whether the parent epic / milestone / project is finished.
  const allTime = completedTotals(tasks, config)
  const doneTasks = tasks.filter(t => t.status === 'done')
  const undatedDone = doneTasks.filter(t => !t.completedAt)

  // On-time delivery: period-completed tasks that carried a deadline, per partner
  const periodCompleted = usePeriodFilter(tasks.filter(t => t.status === 'done'), period)
  const activePartners = partners.filter(p => p.active !== false)
  const delivery = activePartners.map(p => {
    const theirs = periodCompleted.filter(t =>
      t.deadline && t.completedAt && (t.contributors ?? []).some(c => c.partnerId === p.id))
    const delayed = theirs.filter(completedLate)
    const onTime = theirs.filter(t => !completedLate(t))
    return { partner: p, onTime, delayed, pct: theirs.length ? Math.round((onTime.length / theirs.length) * 100) : null }
  })
  const anyDelivery = delivery.some(d => d.pct !== null)

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-pri)' }}>Dashboard</h1>
        <div className="text-sm px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--bg-border)', color: 'var(--sky-blue)' }}>
          {period.label}: {period.start} → {period.end}
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs mb-1" style={{ color: 'var(--text-sec)' }}>All-Time Points</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--sky-blue)' }}>{allTime.total.toFixed(1)}</p>
        </Card>
        <Card>
          <p className="text-xs mb-1" style={{ color: 'var(--text-sec)' }}>Tasks Done</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-pri)' }}>{doneTasks.length}</p>
        </Card>
        <Card>
          <p className="text-xs mb-1" style={{ color: 'var(--text-sec)' }}>Period Points</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-pri)' }}>{totalPoints.toFixed(1)}</p>
        </Card>
        <Card>
          <p className="text-xs mb-1" style={{ color: 'var(--text-sec)' }}>Active Projects</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-pri)' }}>{activeProjects.length}</p>
        </Card>
        <Card>
          <p className="text-xs mb-1" style={{ color: 'var(--text-sec)' }}>Partners</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--text-pri)' }}>{partners.filter(p => p.active !== false).length}</p>
        </Card>
        <Card>
          <p className="text-xs mb-1" style={{ color: 'var(--text-sec)' }}>Pipeline Tasks</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--accent-orng)' }}>{pipeline.length}</p>
        </Card>
      </div>

      {/* All-time partner contribution — the headline "who has done how much" view */}
      <Card>
        <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text-pri)' }}>Partner Points — All Time</h2>
        <p className="text-xs mb-4" style={{ color: 'var(--text-sec)' }}>
          Every task marked Done, across all periods. Credit lands as soon as the task is done — the
          epic, milestone, and project do not need to be complete.
        </p>
        {activePartners.length === 0 ? (
          <p className="text-sm py-4 text-center" style={{ color: 'var(--text-sec)' }}>
            No active partners. <Link to="/partners" style={{ color: 'var(--sky-blue)' }}>Add partners →</Link>
          </p>
        ) : allTime.total === 0 ? (
          <p className="text-sm py-4 text-center" style={{ color: 'var(--text-sec)' }}>
            No completed tasks yet. Mark a task Done to start accruing points.
          </p>
        ) : (
          <>
            <PartnerBar partners={partners} partnerTotals={allTime.totals} />
            <div className="mt-4 pt-4 space-y-2" style={{ borderTop: '1px solid var(--bg-border)' }}>
              {activePartners
                .map(p => ({
                  partner: p,
                  points: allTime.totals[p.id] ?? 0,
                  count: allTime.counts[p.id] ?? 0,
                }))
                .sort((a, b) => b.points - a.points)
                .map(({ partner: p, points, count }) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <PartnerAvatar partner={p} size="sm" />
                    <Link to={`/partners/${p.id}`} className="text-sm font-medium hover:opacity-80" style={{ color: 'var(--text-pri)' }}>
                      {p.name}
                    </Link>
                    <span className="text-xs" style={{ color: 'var(--text-sec)' }}>
                      {count} {count === 1 ? 'task' : 'tasks'} done
                    </span>
                    <span className="flex-1" />
                    <span className="text-sm font-mono" style={{ color: 'var(--sky-blue)' }}>{points.toFixed(1)} pts</span>
                    <span className="text-xs font-mono w-12 text-right" style={{ color: 'var(--text-sec)' }}>
                      {((points / allTime.total) * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
            </div>
          </>
        )}
      </Card>

      {/* Partner bar chart — period-scoped, this is what drives the share calc */}
      <Card>
        <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text-pri)' }}>Partner Points — {period.label}</h2>
        <p className="text-xs mb-4" style={{ color: 'var(--text-sec)' }}>
          Only tasks completed between {period.start} and {period.end}. This is the subset that feeds the suggested share below.
        </p>
        {activePartners.length === 0 ? (
          <p className="text-sm py-4 text-center" style={{ color: 'var(--text-sec)' }}>
            No active partners. <Link to="/partners" style={{ color: 'var(--sky-blue)' }}>Add partners →</Link>
          </p>
        ) : (
          <>
            <PartnerBar partners={partners} partnerTotals={rollup.partnerTotals} />
            {undatedDone.length > 0 && (
              <p className="text-xs mt-3 px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(245,135,31,0.10)', color: 'var(--accent-orng)' }}>
                {undatedDone.length} completed {undatedDone.length === 1 ? 'task has' : 'tasks have'} no completion date, so
                {undatedDone.length === 1 ? ' it is' : ' they are'} counted in All Time but not in any period.
                Add a completed date on the task to include {undatedDone.length === 1 ? 'it' : 'them'} in the share calculation.
              </p>
            )}
          </>
        )}
      </Card>

      {/* Suggested share vs current */}
      <Card>
        <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text-pri)' }}>Suggested Residual Share</h2>
        <p className="text-xs mb-4" style={{ color: 'var(--text-sec)' }}>
          Based on completed tasks in {period.label}. Residual only — after interest on capital & fixed remuneration.
        </p>
        {Object.keys(rollup.suggestedShare).length === 0 ? (
          <p className="text-sm py-4 text-center" style={{ color: 'var(--text-sec)' }}>
            No completed tasks in this period yet.
          </p>
        ) : (
          <ShareDelta partners={partners} suggestedShare={rollup.suggestedShare} />
        )}
      </Card>

      {/* On-time delivery */}
      <Card>
        <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text-pri)' }}>On-Time Delivery — {period.label}</h2>
        <p className="text-xs mb-4" style={{ color: 'var(--text-sec)' }}>
          Completed tasks that carried a deadline. On time = completed on or before the deadline day. Not part of the share calculation.
        </p>
        {!anyDelivery ? (
          <p className="text-sm py-4 text-center" style={{ color: 'var(--text-sec)' }}>
            No deadline-tracked tasks completed in this period yet.
          </p>
        ) : (
          <div className="space-y-4">
            {delivery.filter(d => d.pct !== null).map(({ partner: p, onTime, delayed, pct }) => (
              <div key={p.id}>
                <div className="flex items-center gap-3 mb-2">
                  <PartnerAvatar partner={p} size="sm" />
                  <Link to={`/partners/${p.id}`} className="text-sm font-medium hover:opacity-80" style={{ color: 'var(--text-pri)' }}>{p.name}</Link>
                  <div className="flex-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-border)', height: 6 }}>
                    <div className="h-full rounded-full" style={{
                      width: `${pct}%`,
                      backgroundColor: pct === 100 ? 'var(--success-green)' : pct >= 50 ? 'var(--accent-blue)' : 'var(--danger-red)',
                    }} />
                  </div>
                  <span className="text-sm font-mono flex-shrink-0" style={{ color: pct === 100 ? 'var(--success-green)' : pct >= 50 ? 'var(--sky-blue)' : 'var(--danger-red)' }}>
                    {pct}% on time
                  </span>
                  <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-sec)' }}>
                    ({onTime.length} on time · {delayed.length} delayed)
                  </span>
                </div>
                <div className="flex gap-2 flex-wrap pl-9">
                  {onTime.map(t => (
                    <span key={t.id} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(74,222,128,0.12)', color: 'var(--success-green)' }}>
                      ✓ {t.title}
                    </span>
                  ))}
                  {delayed.map(t => (
                    <span key={t.id} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(248,113,113,0.12)', color: 'var(--danger-red)' }}>
                      ⚑ {t.title} ({t.completedAt.slice(0, 10)} vs {t.deadline.slice(0, 10)})
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {delivery.filter(d => d.pct === null).length > 0 && (
              <p className="text-xs" style={{ color: 'var(--text-sec)' }}>
                No deadline-tracked completions this period: {delivery.filter(d => d.pct === null).map(d => d.partner.name).join(', ')}
              </p>
            )}
          </div>
        )}
      </Card>

      {/* Active projects summary */}
      {activeProjects.length > 0 && (
        <Card>
          <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-pri)' }}>Active Projects</h2>
          <div className="space-y-2">
            {activeProjects.map(p => {
              const pr = rollup.projectRollup[p.id] ?? { points: 0 }
              const mCount = milestones.filter(m => m.projectId === p.id).length
              return (
                <Link key={p.id} to={`/projects/${p.id}`} className="flex items-center justify-between p-3 rounded-lg hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--bg-border)' }}>
                  <div>
                    <span className="font-medium text-sm" style={{ color: 'var(--text-pri)' }}>{p.name}</span>
                    <span className="ml-2 text-xs" style={{ color: 'var(--text-sec)' }}>{mCount} milestones</span>
                  </div>
                  <span className="text-sm font-mono" style={{ color: 'var(--sky-blue)' }}>{pr.points.toFixed(1)} pts</span>
                </Link>
              )
            })}
          </div>
        </Card>
      )}

      {/* Pipeline */}
      {pipeline.length > 0 && (
        <Card>
          <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text-pri)' }}>Pipeline</h2>
          <p className="text-xs mb-4" style={{ color: 'var(--text-sec)' }}>
            In-progress tasks — not counted in share calculation until completed.
          </p>
          <div className="space-y-2">
            {pipeline.slice(0, 10).map(t => {
              const epic = epics.find(e => e.id === t.epicId)
              const score = scoreTask(t, { impactCap: 3 })
              return (
                <div key={t.id} className="flex items-center justify-between p-2 rounded-lg"
                  style={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--bg-border)' }}>
                  <div>
                    <span className="text-sm" style={{ color: 'var(--text-pri)' }}>{t.title}</span>
                    {epic && <span className="ml-2 text-xs" style={{ color: 'var(--text-sec)' }}>{epic.name}</span>}
                  </div>
                  <span className="text-xs font-mono" style={{ color: 'var(--accent-orng)' }}>{score} pts (pending)</span>
                </div>
              )
            })}
            {pipeline.length > 10 && (
              <p className="text-xs" style={{ color: 'var(--text-sec)' }}>…and {pipeline.length - 10} more</p>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
