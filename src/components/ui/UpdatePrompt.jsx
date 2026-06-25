import { useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

export default function UpdatePrompt() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW()
  const [actualizando, setActualizando] = useState(false)

  function aplicarUpdate() {
    setActualizando(true)
    setTimeout(() => updateServiceWorker(true), 400)
    // si en 8 segundos no recargó, volver al estado anterior
    setTimeout(() => setActualizando(false), 8000)
  }

  // Pantalla de carga mientras recarga
  if (actualizando) return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-4"
      style={{ background: '#0D0D14' }}>
      <div className="text-5xl animate-bounce">⚡</div>
      <p className="text-white font-bold text-[18px]">Actualizando…</p>
      <p className="text-gray-500 text-[13px]">Ya volvemos, un segundo</p>
      <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mt-2" />
    </div>
  )

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
          onClick={aplicarUpdate}
          className="px-3 py-1.5 rounded-xl text-white text-[12px] font-bold shrink-0"
          style={{ background: '#3B82F6' }}>
          Actualizar
        </button>
      </div>
    </div>
  )
}
