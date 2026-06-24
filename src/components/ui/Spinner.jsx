export function Spinner({ size = 'md' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }
  return (
    <div
      className={`${sizes[size]} rounded-full border-2 animate-spin`}
      style={{ borderColor: 'var(--bg-border)', borderTopColor: 'var(--accent-blue)' }}
    />
  )
}

export function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: 'var(--bg-base)' }}>
      <div className="text-center">
        <Spinner size="lg" />
        <p className="mt-3 text-sm" style={{ color: 'var(--text-sec)' }}>Loading…</p>
      </div>
    </div>
  )
}
