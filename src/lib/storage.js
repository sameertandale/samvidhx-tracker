// In-memory store for local dev (no wrangler needed)
const _mem = new Map()

async function devGet(key) {
  return _mem.has(key) ? _mem.get(key) : null
}
async function devSet(key, value) {
  _mem.set(key, value)
  return { ok: true }
}
async function devDelete(key) {
  _mem.delete(key)
  return { ok: true }
}
async function devList(prefix) {
  return { keys: [..._mem.keys()].filter(k => k.startsWith(prefix)) }
}

const isDev = import.meta.env.DEV

export const db = {
  async get(key) {
    if (isDev) return devGet(key)
    const res = await fetch(`/api/storage?key=${encodeURIComponent(key)}`)
    if (!res.ok) return null
    const data = await res.json()
    return data.value ?? null
  },

  async set(key, value) {
    if (isDev) return devSet(key, value)
    const res = await fetch('/api/storage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    })
    if (!res.ok) throw new Error(`Storage set failed for key: ${key}`)
    return res.json()
  },

  async delete(key) {
    if (isDev) return devDelete(key)
    const res = await fetch(`/api/storage?key=${encodeURIComponent(key)}`, { method: 'DELETE' })
    if (!res.ok) throw new Error(`Storage delete failed for key: ${key}`)
    return res.json()
  },

  async list(prefix) {
    if (isDev) return devList(prefix)
    const res = await fetch(`/api/storage/list?prefix=${encodeURIComponent(prefix)}`)
    if (!res.ok) return { keys: [] }
    return res.json()
  },
}
