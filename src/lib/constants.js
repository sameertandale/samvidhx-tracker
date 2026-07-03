export const FIBONACCI = [1, 2, 3, 5, 8, 13]

// Tasks with a deadline within this many days (and not done) get the due-soon pulse
export const DUE_SOON_DAYS = 10

export const COMPLEXITY_BANDS = [
  { label: 'Routine',     value: 1   },
  { label: 'Skilled',     value: 1.5 },
  { label: 'Specialized', value: 2   },
]

export const IMPACT_TIERS = [
  { label: 'Low',      value: 1 },
  { label: 'Medium',   value: 2 },
  { label: 'Critical', value: 3 },
]

export const STREAMS = [
  { label: 'Execution', value: 'execution' },
  { label: 'BizDev',    value: 'bizdev'    },
  { label: 'IP',        value: 'ip'        },
  { label: 'Ops',       value: 'ops'       },
]

export const TASK_STATUSES = [
  { label: 'Backlog',     value: 'backlog'     },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Done',        value: 'done'        },
  { label: 'Blocked',     value: 'blocked'     },
]

export const EPIC_STATUSES = [
  { label: 'Backlog',     value: 'backlog'     },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Done',        value: 'done'        },
  { label: 'Blocked',     value: 'blocked'     },
]

export const PROJECT_STATUSES = [
  { label: 'Active', value: 'active' },
  { label: 'Paused', value: 'paused' },
  { label: 'Done',   value: 'done'   },
]

export const MILESTONE_STATUSES = [
  { label: 'Planned',     value: 'planned'     },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Shipped',     value: 'shipped'     },
  { label: 'Cancelled',   value: 'cancelled'   },
]

export const DEFAULT_CONFIG = {
  fibonacci: [1, 2, 3, 5, 8, 13],
  complexityBands: { routine: 1, skilled: 1.5, specialized: 2 },
  impactTiers: { low: 1, medium: 2, critical: 3 },
  impactCap: 3,
  countOnlyCompleted: true,
  currentPeriod: { label: 'Q1 FY26', start: '2026-04-01', end: '2026-06-30' },
}
