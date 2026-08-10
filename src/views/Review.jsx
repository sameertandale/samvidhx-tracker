import { useState } from 'react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { PartnerAvatar } from '../components/ui/PartnerAvatar'
import { rollUp, assignedTotals } from '../lib/scoring'

export function Review({ appData }) {
  const { config, partners, projects, milestones, epics, tasks } = appData
  const [copied, setCopied] = useState(false)

  // Use config's period (only one period in this version)
  const period = config.currentPeriod
  const activePartners = partners.filter(p => p.active !== false)

  // Compute rollup for this period
  const ru = rollUp(tasks, epics, milestones, projects, config)
  const { partnerTotals, portfolioTotal, suggestedShare } = ru

  // Total assigned points per partner across all tasks, regardless of task
  // status or whether the containing milestone/epic/project is complete.
  const assigned = assignedTotals(tasks, config)

  const rows = activePartners.map(p => ({
    partner: p,
    completed: partnerTotals[p.id] ?? 0,
    assigned: assigned[p.id] ?? 0,
    suggested: suggestedShare[p.id] ?? 0,
    current: p.currentShare ?? null,
    delta: p.currentShare != null ? (suggestedShare[p.id] ?? 0) - p.currentShare : null,
  })).sort((a, b) => b.completed - a.completed)

  const exportText = [
    `SamvidhX Systems LLP — Effort Share Review`,
    `Period: ${period.label} (${period.start} to ${period.end})`,
    `Generated: ${new Date().toISOString().slice(0, 10)}`,
    ``,
    `Note: Residual share only. Requires partner consensus and MCA Form 3 filing.`,
    ``,
    `Partner            | Points (Done/Assigned) | Suggested %  | Current %  | Delta`,
    `-`.repeat(90),
    ...rows.map(r =>
      `${r.partner.name.padEnd(18)} | ${(r.completed.toFixed(1) + '/' + r.assigned.toFixed(1)).padStart(23)} | ${r.suggested.toFixed(1).padStart(12)}%  | ${(r.current ?? '—').toString().padStart(10)} | ${r.delta != null ? (r.delta > 0 ? '+' : '') + r.delta.toFixed(1) + '%' : '—'}`
    ),
    ``,
    `Total portfolio points: ${portfolioTotal.toFixed(1)}`,
  ].join('\n')

  const handleCopy = async () => {
    await navigator.clipboard.writeText(exportText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-pri)' }}>Effort Share Review</h1>
        <div className="text-sm px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--bg-border)', color: 'var(--sky-blue)' }}>
          {period.label}
        </div>
      </div>

      <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(21,100,249,0.08)', border: '1px solid rgba(21,100,249,0.2)', color: 'var(--sky-blue)' }}>
        ⚠️ Residual share only. Requires partner consensus and MCA Form 3 filing.
      </div>

      <Card>
        {rows.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-3xl mb-2">📊</p>
            <p className="font-medium mb-1" style={{ color: 'var(--text-pri)' }}>No data for this period</p>
            <p className="text-sm" style={{ color: 'var(--text-sec)' }}>Mark tasks as done within the period dates to see suggested shares.</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--bg-border)' }}>
                  <th className="text-left pb-3 font-medium" style={{ color: 'var(--text-sec)' }}>Partner</th>
                  <th className="text-right pb-3 font-medium" style={{ color: 'var(--text-sec)' }}>Points (Done/Assigned)</th>
                  <th className="text-right pb-3 font-medium" style={{ color: 'var(--text-sec)' }}>Suggested %</th>
                  <th className="text-right pb-3 font-medium" style={{ color: 'var(--text-sec)' }}>Current %</th>
                  <th className="text-right pb-3 font-medium" style={{ color: 'var(--text-sec)' }}>Delta</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.partner.id} style={{ borderBottom: '1px solid var(--bg-border)' }}>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <PartnerAvatar partner={r.partner} size="sm" />
                        <div>
                          <p style={{ color: 'var(--text-pri)' }}>{r.partner.name}</p>
                          {r.partner.role && <p className="text-xs" style={{ color: 'var(--text-sec)' }}>{r.partner.role}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-right font-mono" style={{ color: 'var(--sky-blue)' }}>
                      {r.completed.toFixed(1)}<span style={{ color: 'var(--text-sec)' }}>/{r.assigned.toFixed(1)}</span>
                    </td>
                    <td className="py-3 text-right font-mono font-semibold" style={{ color: 'var(--text-pri)' }}>{r.suggested.toFixed(1)}%</td>
                    <td className="py-3 text-right font-mono" style={{ color: 'var(--text-sec)' }}>
                      {r.current != null ? `${r.current}%` : '—'}
                    </td>
                    <td className="py-3 text-right font-mono">
                      {r.delta != null ? (
                        <span style={{ color: r.delta > 0 ? '#4ADE80' : r.delta < 0 ? '#F87171' : 'var(--text-sec)' }}>
                          {r.delta > 0 ? '+' : ''}{r.delta.toFixed(1)}%
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="pt-3 text-sm font-medium" style={{ color: 'var(--text-sec)' }}>Total</td>
                  <td className="pt-3 text-right font-mono font-semibold" style={{ color: 'var(--sky-blue)' }}>
                    {portfolioTotal.toFixed(1)}<span style={{ color: 'var(--text-sec)' }}>/{rows.reduce((s, r) => s + r.assigned, 0).toFixed(1)}</span>
                  </td>
                  <td className="pt-3 text-right font-mono" style={{ color: 'var(--text-sec)' }}>100.0%</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </>
        )}
      </Card>

      {rows.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={handleCopy}>
            {copied ? '✓ Copied!' : 'Export to Clipboard'}
          </Button>
        </div>
      )}
    </div>
  )
}
