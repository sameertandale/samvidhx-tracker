export function scoreTask(task, config) {
  const cap = config?.impactCap ?? 3
  const e = task.effortPoints ?? 1
  const c = task.complexityBand ?? 1
  const i = Math.min(task.impactTier ?? 1, cap)
  return e * c * i
}

export function rollUp(allTasks, allEpics, allMilestones, allProjects, config) {
  const countOnlyCompleted = config?.countOnlyCompleted ?? true
  const period = config?.currentPeriod

  // Partner totals for the current period
  const partnerTotals = {}

  // Epic points map: epicId -> { points, pointsByPartner }
  const epicRollup = {}
  for (const epic of allEpics) {
    const tasks = allTasks.filter(t => t.epicId === epic.id)
    let epicPoints = 0
    const epicByPartner = {}

    for (const task of tasks) {
      if (countOnlyCompleted && task.status !== 'done') continue
      const score = scoreTask(task, config)
      epicPoints += score

      for (const contrib of (task.contributors ?? [])) {
        const credit = score * contrib.weight
        epicByPartner[contrib.partnerId] = (epicByPartner[contrib.partnerId] ?? 0) + credit

        // Only count in period totals if completedAt is within currentPeriod
        if (period && task.completedAt) {
          const d = task.completedAt.slice(0, 10)
          if (d >= period.start && d <= period.end) {
            partnerTotals[contrib.partnerId] = (partnerTotals[contrib.partnerId] ?? 0) + credit
          }
        } else if (!period) {
          partnerTotals[contrib.partnerId] = (partnerTotals[contrib.partnerId] ?? 0) + credit
        }
      }
    }
    epicRollup[epic.id] = { points: epicPoints, pointsByPartner: epicByPartner }
  }

  // Milestone rollup: milestoneId -> { points, pointsByPartner }
  const milestoneRollup = {}
  for (const ms of allMilestones) {
    const epics = allEpics.filter(e => e.milestoneId === ms.id)
    let msPoints = 0
    const msByPartner = {}
    for (const epic of epics) {
      const er = epicRollup[epic.id] ?? { points: 0, pointsByPartner: {} }
      msPoints += er.points
      for (const [pid, pts] of Object.entries(er.pointsByPartner)) {
        msByPartner[pid] = (msByPartner[pid] ?? 0) + pts
      }
    }
    milestoneRollup[ms.id] = { points: msPoints, pointsByPartner: msByPartner }
  }

  // Project rollup: projectId -> { points, pointsByPartner }
  const projectRollup = {}
  for (const prj of allProjects) {
    const milestones = allMilestones.filter(m => m.projectId === prj.id)
    let prjPoints = 0
    const prjByPartner = {}
    for (const ms of milestones) {
      const mr = milestoneRollup[ms.id] ?? { points: 0, pointsByPartner: {} }
      prjPoints += mr.points
      for (const [pid, pts] of Object.entries(mr.pointsByPartner)) {
        prjByPartner[pid] = (prjByPartner[pid] ?? 0) + pts
      }
    }
    projectRollup[prj.id] = { points: prjPoints, pointsByPartner: prjByPartner }
  }

  // Portfolio totals
  const portfolioTotal = Object.values(partnerTotals).reduce((s, v) => s + v, 0)
  const suggestedShare = {}
  for (const [pid, pts] of Object.entries(partnerTotals)) {
    suggestedShare[pid] = portfolioTotal > 0 ? (pts / portfolioTotal) * 100 : 0
  }

  return { epicRollup, milestoneRollup, projectRollup, partnerTotals, portfolioTotal, suggestedShare }
}
