export function Card({ children, className = '', onClick, style = {} }) {
  return (
    <div
      className={`rounded-xl p-4 ${onClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''} ${className}`}
      style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--bg-border)', ...style }}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
