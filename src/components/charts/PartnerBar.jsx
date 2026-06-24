import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export function PartnerBar({ partners, partnerTotals }) {
  const data = partners
    .filter(p => p.active !== false)
    .map(p => ({ name: p.name, points: +(partnerTotals[p.id] ?? 0).toFixed(1), color: p.color ?? '#1564F9' }))
    .sort((a, b) => b.points - a.points)

  if (data.length === 0) return (
    <p className="text-sm text-center py-8" style={{ color: 'var(--text-sec)' }}>No partner data for this period.</p>
  )

  return (
    <ResponsiveContainer width="100%" height={data.length * 48 + 24}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 80 }}>
        <XAxis type="number" tick={{ fill: 'var(--text-sec)', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-pri)', fontSize: 13 }} axisLine={false} tickLine={false} width={76} />
        <Tooltip
          contentStyle={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderRadius: 8 }}
          labelStyle={{ color: 'var(--text-pri)' }}
          itemStyle={{ color: 'var(--sky-blue)' }}
          formatter={(v) => [`${v} pts`, 'Points']}
        />
        <Bar dataKey="points" radius={[0, 4, 4, 0]}>
          {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
