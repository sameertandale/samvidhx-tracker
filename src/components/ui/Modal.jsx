import { useEffect } from 'react'

export function Modal({ open, onClose, title, children, width = 'max-w-lg' }) {
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className={`relative w-full ${width} rounded-xl shadow-2xl`}
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--bg-border)', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--bg-border)' }}>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-pri)' }}>{title}</h2>
          <button
            onClick={onClose}
            className="text-2xl leading-none hover:opacity-70 transition-opacity"
            style={{ color: 'var(--text-sec)' }}
          >
            ×
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}
