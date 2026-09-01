import { FIBONACCI, COMPLEXITY_BANDS, IMPACT_TIERS, TASK_STATUSES, STREAMS } from './constants'

const HEADERS = [
  'TaskId', 'Milestone', 'Epic', 'Title', 'Description', 'Stream', 'Status',
  'EffortPoints', 'ComplexityBand', 'ImpactTier', 'Deadline', 'Contributors',
  'EstimatedAt', 'CompletedAt', 'CreatedAt',
]

function csvField(value) {
  const s = value == null ? '' : String(value)
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
  return s
}

export function stringifyCsv(rows) {
  return rows.map(row => row.map(csvField).join(',')).join('\r\n')
}

// Minimal RFC4180-ish CSV parser: handles quoted fields, escaped quotes, commas/newlines in quotes.
export function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  const src = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else {
        field += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(field); field = ''
    } else if (ch === '\n') {
      row.push(field); field = ''
      rows.push(row); row = []
    } else {
      field += ch
    }
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row) }
  return rows.filter(r => !(r.length === 1 && r[0] === ''))
}

function dateOnly(iso) {
  return iso ? iso.slice(0, 10) : ''
}

function contributorsToField(contributors, partners) {
  return (contributors ?? [])
    .map(c => {
      const p = partners.find(x => x.id === c.partnerId)
      return `${p?.name ?? c.partnerId}:${c.weight}`
    })
    .join(';')
}

export function exportProjectTasksCsv(project, milestones, epics, tasks, partners) {
  const myMilestones = milestones.filter(m => m.projectId === project.id)
  const msById = new Map(myMilestones.map(m => [m.id, m]))
  const myEpics = epics.filter(e => msById.has(e.milestoneId))
  const epicIds = new Set(myEpics.map(e => e.id))
  const myTasks = tasks.filter(t => epicIds.has(t.epicId))
  const epicById = new Map(myEpics.map(e => [e.id, e]))

  const rows = [HEADERS]
  for (const t of myTasks) {
    const epic = epicById.get(t.epicId)
    const ms = epic ? msById.get(epic.milestoneId) : null
    rows.push([
      t.id,
      ms?.label ?? '',
      epic?.name ?? '',
      t.title,
      t.description ?? '',
      t.stream ?? '',
      t.status ?? '',
      t.effortPoints ?? '',
      t.complexityBand ?? '',
      t.impactTier ?? '',
      dateOnly(t.deadline),
      contributorsToField(t.contributors, partners),
      dateOnly(t.estimatedAt),
      dateOnly(t.completedAt),
      dateOnly(t.createdAt),
    ])
  }
  return stringifyCsv(rows)
}

function parseContributorsField(field, partners, errors) {
  const trimmed = (field ?? '').trim()
  if (!trimmed) { errors.push('Contributors is required'); return null }
  const parts = trimmed.split(';').map(p => p.trim()).filter(Boolean)
  const contributors = []
  for (const part of parts) {
    const idx = part.lastIndexOf(':')
    if (idx === -1) { errors.push(`Malformed contributor "${part}" (expected Name:weight)`); continue }
    const name = part.slice(0, idx).trim()
    const weight = Number(part.slice(idx + 1).trim())
    const partner = partners.find(p => p.name.toLowerCase() === name.toLowerCase())
    if (!partner) { errors.push(`Unknown partner "${name}"`); continue }
    if (!Number.isFinite(weight)) { errors.push(`Invalid weight for "${name}"`); continue }
    contributors.push({ partnerId: partner.id, weight: +weight.toFixed(3) })
  }
  if (contributors.length === 0) return null
  const total = contributors.reduce((s, c) => s + c.weight, 0)
  if (Math.abs(total - 1.0) > 0.001) {
    errors.push(`Contributor weights sum to ${total.toFixed(3)}, must be 1.0`)
  }
  return contributors
}

function parseDateField(field, label, errors, { required = false } = {}) {
  const trimmed = (field ?? '').trim()
  if (!trimmed) {
    if (required) errors.push(`${label} is required`)
    return null
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed) || Number.isNaN(new Date(trimmed).getTime())) {
    errors.push(`${label} "${trimmed}" is not a valid YYYY-MM-DD date`)
    return null
  }
  return trimmed + 'T00:00:00.000Z'
}

// Validate + resolve every row against current app state. Nothing is written here.
// Returns { rows: [{ action: 'create'|'update'|'error', errors: string[], data, sourceLine }], summary }
export function buildImportPreview(csvText, { project, milestones, epics, tasks, partners }) {
  const parsed = parseCsv(csvText)
  if (parsed.length === 0) return { rows: [], summary: { create: 0, update: 0, error: 0 } }

  const header = parsed[0].map(h => h.trim())
  const colIdx = Object.fromEntries(HEADERS.map(h => [h, header.indexOf(h)]))
  const missingCols = HEADERS.filter(h => colIdx[h] === -1 && h !== 'TaskId')
  if (colIdx.Title === -1) {
    return { rows: [{ action: 'error', errors: [`CSV is missing required column "Title". Found columns: ${header.join(', ')}`], data: null, sourceLine: 1 }], summary: { create: 0, update: 0, error: 1 } }
  }

  const myMilestones = milestones.filter(m => m.projectId === project.id)
  const myEpics = epics.filter(e => myMilestones.some(m => m.id === e.milestoneId))
  const myTaskIds = new Set(tasks.filter(t => myEpics.some(e => e.id === t.epicId)).map(t => t.id))

  const get = (row, key) => (colIdx[key] > -1 ? (row[colIdx[key]] ?? '') : '')

  const rows = []
  for (let i = 1; i < parsed.length; i++) {
    const row = parsed[i]
    if (row.every(c => c.trim() === '')) continue
    const errors = []
    const sourceLine = i + 1

    const taskId = get(row, 'TaskId').trim()
    const title = get(row, 'Title').trim()
    if (!title) errors.push('Title is required')

    const msLabel = get(row, 'Milestone').trim()
    const epicName = get(row, 'Epic').trim()
    const milestone = myMilestones.find(m => m.label === msLabel)
    if (!milestone) errors.push(`Milestone "${msLabel}" not found in this project`)
    const epic = milestone ? myEpics.find(e => e.milestoneId === milestone.id && e.name === epicName) : null
    if (milestone && !epic) errors.push(`Epic "${epicName}" not found under milestone "${msLabel}"`)

    const stream = get(row, 'Stream').trim() || 'execution'
    if (!STREAMS.some(s => s.value === stream)) errors.push(`Invalid Stream "${stream}"`)

    const status = get(row, 'Status').trim() || 'backlog'
    if (!TASK_STATUSES.some(s => s.value === status)) errors.push(`Invalid Status "${status}"`)

    const effortPoints = Number(get(row, 'EffortPoints'))
    if (!FIBONACCI.includes(effortPoints)) errors.push(`EffortPoints must be one of ${FIBONACCI.join(',')}`)

    const complexityBand = Number(get(row, 'ComplexityBand'))
    if (!COMPLEXITY_BANDS.some(b => b.value === complexityBand)) errors.push(`ComplexityBand must be one of ${COMPLEXITY_BANDS.map(b => b.value).join(',')}`)

    const impactTier = Number(get(row, 'ImpactTier'))
    if (!IMPACT_TIERS.some(t => t.value === impactTier)) errors.push(`ImpactTier must be one of ${IMPACT_TIERS.map(t => t.value).join(',')}`)

    const contributors = parseContributorsField(get(row, 'Contributors'), partners, errors)

    const deadline = parseDateField(get(row, 'Deadline'), 'Deadline', errors)
    const completedAt = parseDateField(get(row, 'CompletedAt'), 'CompletedAt', errors)
    let estimatedAt = parseDateField(get(row, 'EstimatedAt'), 'EstimatedAt', errors)
    if (!get(row, 'EstimatedAt').trim() && !errors.some(e => e.startsWith('EstimatedAt'))) {
      estimatedAt = new Date().toISOString()
    }

    if (taskId && !myTaskIds.has(taskId)) {
      errors.push(`TaskId "${taskId}" not found among this project's tasks`)
    }

    const action = errors.length > 0 ? 'error' : (taskId ? 'update' : 'create')
    rows.push({
      action,
      errors,
      sourceLine,
      data: errors.length > 0 ? null : {
        id: taskId || undefined,
        epicId: epic.id,
        title,
        description: get(row, 'Description').trim(),
        stream,
        status,
        effortPoints,
        complexityBand,
        impactTier,
        contributors,
        deadline,
        completedAt,
        estimatedAt,
      },
      preview: { taskId, msLabel, epicName, title },
    })
  }

  const summary = rows.reduce((s, r) => ({ ...s, [r.action]: (s[r.action] ?? 0) + 1 }), { create: 0, update: 0, error: 0 })
  return { rows, summary, missingCols }
}
