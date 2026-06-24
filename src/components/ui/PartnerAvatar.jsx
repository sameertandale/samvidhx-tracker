export function PartnerAvatar({ partner, size = 'md' }) {
  const sizes = { sm: 'w-6 h-6 text-xs', md: 'w-8 h-8 text-sm', lg: 'w-10 h-10 text-base' }
  const initials = (partner?.name ?? '?')
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center font-bold flex-shrink-0`}
      style={{ backgroundColor: partner?.color ?? '#1564F9', color: '#fff' }}
      title={partner?.name}
    >
      {initials}
    </div>
  )
}
