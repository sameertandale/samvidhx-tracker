import { useState } from 'react'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { Spinner } from './ui/Spinner'
import { buildImportPreview } from '../lib/csv'

const ACTION_COLOR = { create: '#4ADE80', update: 'var(--sky-blue)', error: '#F87171' }
const ACTION_LABEL = { create: 'Create', update: 'Update', error: 'Error' }

export function TaskCsvImportModal({ open, onClose, project, milestones, epics, tasks, partners, addTask, updateTask }) {
  const [fileName, setFileName] = useState('')
  const [preview, setPreview] = useState(null) // { rows, summary }
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null) // { created, updated, failed }

  const reset = () => { setFileName(''); setPreview(null); setResult(null) }
  const handleClose = () => { reset(); onClose() }

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setResult(null)
    const text = await file.text()
    setPreview(buildImportPreview(text, { project, milestones, epics, tasks, partners }))
  }

  const handleConfirm = async () => {
    if (!preview) return
    setImporting(true)
    let created = 0, updated = 0, failed = 0
    for (const row of preview.rows) {
      if (row.action === 'error') continue
      try {
        if (row.action === 'create') {
          await addTask(row.data)
          created++
        } else {
          const existing = tasks.find(t => t.id === row.data.id)
          await updateTask({ ...existing, ...row.data })
          updated++
        }
      } catch {
        failed++
      }
    }
    setImporting(false)
    setResult({ created, updated, failed })
    setPreview(null)
  }

  const rows = preview?.rows ?? []
  const summary = preview?.summary ?? { create: 0, update: 0, error: 0 }

  return (
    <Modal open={open} onClose={handleClose} title={`Import Tasks — ${project?.name ?? ''}`} width="max-w-3xl">
      <div className="space-y-4">
        <p className="text-sm" style={{ color: 'var(--text-sec)' }}>
          CSV must match the export format. Rows are validated against this project's milestones, epics and
          partners — nothing is saved until you confirm below. Rows with an existing <code>TaskId</code> update
          that task; blank <code>TaskId</code> creates a new one.
        </p>

        <div>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFile}
            className="text-sm"
            style={{ color: 'var(--text-pri)' }}
          />
          {fileName && <p className="text-xs mt-1" style={{ color: 'var(--text-sec)' }}>{fileName}</p>}
        </div>

        {preview && (
          <>
            <div className="flex gap-4 text-sm">
              <span style={{ color: ACTION_COLOR.create }}>{summary.create} to create</span>
              <span style={{ color: ACTION_COLOR.update }}>{summary.update} to update</span>
              <span style={{ color: ACTION_COLOR.error }}>{summary.error} errors</span>
            </div>

            <div className="max-h-80 overflow-y-auto rounded-lg" style={{ border: '1px solid var(--bg-border)' }}>
              <table className="w-full text-xs">
                <thead style={{ backgroundColor: 'var(--bg-base)' }}>
                  <tr>
                    <th className="text-left p-2" style={{ color: 'var(--text-sec)' }}>Line</th>
                    <th className="text-left p-2" style={{ color: 'var(--text-sec)' }}>Action</th>
                    <th className="text-left p-2" style={{ color: 'var(--text-sec)' }}>Title</th>
                    <th className="text-left p-2" style={{ color: 'var(--text-sec)' }}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--bg-border)' }}>
                      <td className="p-2" style={{ color: 'var(--text-sec)' }}>{r.sourceLine}</td>
                      <td className="p-2 font-medium" style={{ color: ACTION_COLOR[r.action] }}>{ACTION_LABEL[r.action]}</td>
                      <td className="p-2" style={{ color: 'var(--text-pri)' }}>{r.preview?.title || '—'}</td>
                      <td className="p-2" style={{ color: r.action === 'error' ? '#F87171' : 'var(--text-sec)' }}>
                        {r.action === 'error' ? r.errors.join('; ') : `${r.preview.msLabel} / ${r.preview.epicName}`}
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr><td colSpan={4} className="p-3 text-center" style={{ color: 'var(--text-sec)' }}>No data rows found in file.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {result && (
          <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-pri)' }}>
            Import complete — {result.created} created, {result.updated} updated
            {result.failed > 0 && <span style={{ color: '#F87171' }}>, {result.failed} failed</span>}.
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="ghost" onClick={handleClose} className="flex-1">Close</Button>
          {preview && !result && (
            <Button
              onClick={handleConfirm}
              disabled={importing || (summary.create === 0 && summary.update === 0)}
              className="flex-1"
            >
              {importing ? <Spinner size="sm" /> : `Confirm Import (${summary.create + summary.update})`}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
