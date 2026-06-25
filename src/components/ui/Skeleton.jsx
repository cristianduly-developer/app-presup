export function Skeleton({ w = '100%', h = 16, rounded = 8, className = '' }) {
  return (
    <div
      className={`animate-pulse ${className}`}
      style={{
        width: w,
        height: h,
        borderRadius: rounded,
        background: 'linear-gradient(90deg, #1E1E2E 25%, #2A2A3A 50%, #1E1E2E 75%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-shimmer 1.4s ease-in-out infinite',
      }}
    />
  )
}

// Inyectamos el keyframe una sola vez
if (typeof document !== 'undefined' && !document.getElementById('sk-style')) {
  const s = document.createElement('style')
  s.id = 'sk-style'
  s.textContent = `@keyframes skeleton-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`
  document.head.appendChild(s)
}

export function KpiSkeleton() {
  return (
    <div className="rounded-2xl p-4 flex flex-col gap-2"
      style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
      <Skeleton w={80} h={10} />
      <Skeleton w={120} h={20} />
      <Skeleton w={80} h={18} rounded={4} />
      <Skeleton w={70} h={10} />
    </div>
  )
}
