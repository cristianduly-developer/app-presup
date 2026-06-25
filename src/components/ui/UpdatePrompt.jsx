import { useRegisterSW } from 'virtual:pwa-register/react'

export default function UpdatePrompt() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm">
      <div className="rounded-2xl px-4 py-3 flex items-center gap-3 shadow-2xl"
        style={{ background: '#1E1E2E', border: '1px solid #3B82F6' }}>
        <span className="text-xl shrink-0">🔄</span>
        <div className="flex-1 min-w-0">
          <p className="text-white text-[13px] font-semibold leading-tight">Nueva versión disponible</p>
          <p className="text-gray-400 text-[11px]">Actualizá para no perderte nada</p>
        </div>
        <button
          onClick={() => updateServiceWorker(true)}
          className="px-3 py-1.5 rounded-xl text-white text-[12px] font-bold shrink-0"
          style={{ background: '#3B82F6' }}>
          Actualizar
        </button>
      </div>
    </div>
  )
}
