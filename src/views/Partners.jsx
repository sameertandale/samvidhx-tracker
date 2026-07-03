import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { PartnerAvatar } from '../components/ui/PartnerAvatar'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Spinner } from '../components/ui/Spinner'

const PRESET_COLORS = ['#1564F9','#60A5FA','#F5871F','#4ADE80','#A78BFA','#F472B6','#FB923C','#34D399']

function PartnerForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    role: initial?.role ?? '',
    color: initial?.color ?? PRESET_COLORS[0],
    active: initial?.active ?? true,
    capitalContributed: initial?.capitalContributed ?? '',
    currentShare: initial?.currentShare ?? '',
  })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    await onSave({
      ...(initial ?? {}),
      name: form.name.trim(),
      role: form.role.trim(),
      color: form.color,
      active: form.active,
      capitalContributed: form.capitalContributed !== '' ? Number(form.capitalContributed) : null,
      currentShare: form.currentShare !== '' ? Number(form.currentShare) : null,
    })
    setSaving(false)
    onClose()
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm mb-1" style={{ color: 'var(--text-sec)' }}>Name *</label>
        <input
          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-pri)' }}
          value={form.name}
          onChange={e => set('name', e.target.value)}
          placeholder="Partner name"
        />
      </div>
      <div>
        <label className="block text-sm mb-1" style={{ color: 'var(--text-sec)' }}>Role</label>
        <input
          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-pri)' }}
          value={form.role}
          onChange={e => set('role', e.target.value)}
          placeholder="e.g. R&D, BD, Ops"
        />
      </div>
      <div>
        <label className="block text-sm mb-2" style={{ color: 'var(--text-sec)' }}>Colour</label>
        <div className="flex gap-2 flex-wrap">
          {PRESET_COLORS.map(c => (
            <button
              key={c}
              className="w-7 h-7 rounded-full transition-transform hover:scale-110"
              style={{ backgroundColor: c, outline: form.color === c ? '2px solid white' : 'none', outlineOffset: 2 }}
              onClick={() => set('color', c)}
            />
          ))}
          <input type="color" value={form.color} onChange={e => set('color', e.target.value)}
            className="w-7 h-7 rounded-full cursor-pointer border-0 p-0" style={{ backgroundColor: 'transparent' }} />
        </div>
      </div>
      <div>
        <label className="block text-sm mb-1" style={{ color: 'var(--text-sec)' }}>Current Profit Share % (reference)</label>
        <input
          type="number" min="0" max="100" step="0.1"
          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-pri)' }}
          value={form.currentShare}
          onChange={e => set('currentShare', e.target.value)}
          placeholder="e.g. 33.3"
        />
      </div>
      <div>
        <label className="block text-sm mb-1" style={{ color: 'var(--text-sec)' }}>Capital Contributed ₹ (reference only)</label>
        <input
          type="number" min="0"
          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-pri)' }}
          value={form.capitalContributed}
          onChange={e => set('capitalContributed', e.target.value)}
          placeholder="₹ amount"
        />
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="active-chk" checked={form.active} onChange={e => set('active', e.target.checked)}
          className="rounded" />
        <label htmlFor="active-chk" className="text-sm" style={{ color: 'var(--text-sec)' }}>Active (included in share calc)</label>
      </div>
      <div className="flex gap-3 pt-2">
        <Button variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
        <Button onClick={handleSave} disabled={!form.name.trim() || saving} className="flex-1">
          {saving ? <Spinner size="sm" /> : (initial ? 'Save' : 'Add Partner')}
        </Button>
      </div>
    </div>
  )
}

export function Partners({ appData }) {
  const { partners, addPartner, updatePartner, deletePartner } = appData
  const navigate = useNavigate()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const openAdd = () => { setEditing(null); setModalOpen(true) }
  const openEdit = (p) => { setEditing(p); setModalOpen(true) }

  const handleSave = (data) => {
    if (editing) return updatePartner({ ...editing, ...data })
    return addPartner(data)
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-pri)' }}>Partners</h1>
        <Button onClick={openAdd}>+ Add Partner</Button>
      </div>

      {partners.length === 0 ? (
        <Card className="text-center py-16">
          <p className="text-4xl mb-3">👥</p>
          <p className="font-medium mb-1" style={{ color: 'var(--text-pri)' }}>No partners yet</p>
          <p className="text-sm mb-4" style={{ color: 'var(--text-sec)' }}>Add partners to start tracking contributions.</p>
          <Button onClick={openAdd}>Add First Partner</Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {partners.map(p => (
            <Card key={p.id} className="flex items-center gap-4" onClick={() => navigate(`/partners/${p.id}`)}>
              <PartnerAvatar partner={p} size="lg" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold" style={{ color: 'var(--text-pri)' }}>{p.name}</span>
                  {!p.active && (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg-border)', color: 'var(--text-sec)' }}>
                      Inactive
                    </span>
                  )}
                </div>
                {p.role && <p className="text-sm" style={{ color: 'var(--text-sec)' }}>{p.role}</p>}
                <div className="flex gap-4 mt-1">
                  {p.currentShare != null && (
                    <span className="text-xs" style={{ color: 'var(--text-sec)' }}>Current share: {p.currentShare}%</span>
                  )}
                  {p.capitalContributed != null && (
                    <span className="text-xs" style={{ color: 'var(--text-sec)' }}>Capital: ₹{p.capitalContributed.toLocaleString()}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>Edit</Button>
                <Button variant="danger" size="sm" onClick={() => setDeleteTarget(p)}>Delete</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Partner' : 'Add Partner'}>
        <PartnerForm initial={editing} onSave={handleSave} onClose={() => setModalOpen(false)} />
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deletePartner(deleteTarget.id)}
        title="Delete Partner"
        message={`Remove "${deleteTarget?.name}"? Their past task attribution data will remain but they'll be excluded from future calculations.`}
      />
    </div>
  )
}
