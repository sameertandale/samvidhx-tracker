import { useState } from 'react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Spinner } from '../components/ui/Spinner'

export function Settings({ appData }) {
  const { config, saveConfig } = appData
  const [form, setForm] = useState(() => ({
    periodLabel: config.currentPeriod.label,
    periodStart: config.currentPeriod.start,
    periodEnd: config.currentPeriod.end,
    impactCap: config.impactCap,
    countOnlyCompleted: config.countOnlyCompleted,
    // Complexity bands
    cbRoutine: config.complexityBands.routine,
    cbSkilled: config.complexityBands.skilled,
    cbSpecialized: config.complexityBands.specialized,
    // Impact tiers
    itLow: config.impactTiers.low,
    itMedium: config.impactTiers.medium,
    itCritical: config.impactTiers.critical,
  }))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    await saveConfig({
      ...config,
      currentPeriod: {
        label: form.periodLabel,
        start: form.periodStart,
        end: form.periodEnd,
      },
      impactCap: Number(form.impactCap),
      countOnlyCompleted: form.countOnlyCompleted,
      complexityBands: {
        routine: Number(form.cbRoutine),
        skilled: Number(form.cbSkilled),
        specialized: Number(form.cbSpecialized),
      },
      impactTiers: {
        low: Number(form.itLow),
        medium: Number(form.itMedium),
        critical: Number(form.itCritical),
      },
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg text-sm outline-none'
  const inputStyle = { backgroundColor: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-pri)' }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--text-pri)' }}>Settings</h1>

      <Card>
        <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-pri)' }}>Review Period</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-sec)' }}>Period Label</label>
            <input className={inputCls} style={inputStyle} value={form.periodLabel}
              onChange={e => set('periodLabel', e.target.value)} placeholder="e.g. Q1 FY26" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--text-sec)' }}>Start Date</label>
              <input type="date" className={inputCls} style={inputStyle} value={form.periodStart}
                onChange={e => set('periodStart', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--text-sec)' }}>End Date</label>
              <input type="date" className={inputCls} style={inputStyle} value={form.periodEnd}
                onChange={e => set('periodEnd', e.target.value)} />
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-pri)' }}>Scoring Model</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-2" style={{ color: 'var(--text-sec)' }}>Complexity Bands (multipliers)</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: 'cbRoutine', label: 'Routine' },
                { key: 'cbSkilled', label: 'Skilled' },
                { key: 'cbSpecialized', label: 'Specialized' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-sec)' }}>{label}</label>
                  <input type="number" min="0.1" max="10" step="0.1"
                    className={inputCls} style={inputStyle}
                    value={form[key]} onChange={e => set(key, e.target.value)} />
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm mb-2" style={{ color: 'var(--text-sec)' }}>Impact Tiers (multipliers)</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: 'itLow', label: 'Low' },
                { key: 'itMedium', label: 'Medium' },
                { key: 'itCritical', label: 'Critical' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-sec)' }}>{label}</label>
                  <input type="number" min="1" max="10" step="0.5"
                    className={inputCls} style={inputStyle}
                    value={form[key]} onChange={e => set(key, e.target.value)} />
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-sec)' }}>Impact Cap</label>
            <input type="number" min="1" max="10" step="1"
              className={inputCls} style={inputStyle}
              value={form.impactCap} onChange={e => set('impactCap', e.target.value)} />
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="coc-chk" checked={form.countOnlyCompleted}
              onChange={e => set('countOnlyCompleted', e.target.checked)} className="rounded" />
            <label htmlFor="coc-chk" className="text-sm" style={{ color: 'var(--text-sec)' }}>
              Count only completed tasks in share calculation
            </label>
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Spinner size="sm" /> : saved ? '✓ Saved' : 'Save Settings'}
        </Button>
      </div>
    </div>
  )
}
