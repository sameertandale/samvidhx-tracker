export function Button({ children, onClick, variant = 'primary', size = 'md', disabled, type = 'button', className = '' }) {
  const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

  const variants = {
    primary:   'focus:ring-offset-[var(--bg-base)] focus:ring-[var(--accent-blue)]',
    ghost:     'focus:ring-offset-[var(--bg-base)] focus:ring-[var(--bg-border)]',
    danger:    'focus:ring-offset-[var(--bg-base)] focus:ring-red-500',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  }

  const variantStyles = {
    primary: { backgroundColor: 'var(--accent-blue)', color: 'var(--text-pri)' },
    ghost:   { backgroundColor: 'transparent', color: 'var(--text-sec)', border: '1px solid var(--bg-border)' },
    danger:  { backgroundColor: '#DC2626', color: 'var(--text-pri)' },
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant] ?? ''} ${sizes[size] ?? ''} ${className}`}
      style={variantStyles[variant]}
    >
      {children}
    </button>
  )
}
