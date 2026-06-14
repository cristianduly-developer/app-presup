import { useNavigate } from 'react-router-dom'
import { X, ChevronRight } from 'lucide-react'
import { usePlantillas } from '../../lib/usePlantillas'

const CREAR = [
  { emoji: '📋', label: 'Nuevo presupuesto',  desc: 'Desde cero',              bg: '#1A3A6B', to: '/presupuestos/nuevo' },
  { emoji: '🏗',  label: 'Nueva obra',         desc: 'Sin presupuesto previo',  bg: '#2A1A0A', to: '/obras/nueva' },
  { emoji: '📅', label: 'Agenda visita',       desc: 'Con cliente',             bg: '#2A1A3A', to: '/agenda' },
  { emoji: '🛒', label: 'Gasto de obra',       desc: 'Registrar gasto',         bg: '#2A1A0A', to: '/registro?tipo=gasto' },
  { emoji: '💰', label: 'Pago recibido',       desc: 'De un cliente',           bg: '#0A2A1A', to: '/registro?tipo=pago' },
  { emoji: '⏱',  label: 'Horas trabajadas',   desc: 'Tiempo de trabajo',       bg: '#0A2A2A', to: '/registro?tipo=horas' },
]

export default function CreateModal({ onClose }) {
  const navigate = useNavigate()
  const { plantillas } = usePlantillas()

  function go(to) { onClose(); navigate(to) }

  function usarPlantilla(id) {
    onClose()
    navigate(`/presupuestos/nuevo?plantilla=${id}`)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="flex-1" onClick={onClose} />
      <div className="rounded-t-3xl overflow-y-auto max-h-[92vh]"
        style={{ background: '#13131E', border: '1px solid #1E1E2E' }}
        onClick={e => e.stopPropagation()}>

        {/* handle + header */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: '#2A2A3A' }} />
        </div>
        <div className="flex items-center justify-between px-5 py-3">
          <div>
            <p className="text-white font-bold text-[18px]">¿Qué querés crear?</p>
            <p className="text-gray-400 text-[13px]">Elegí la opción que necesitás</p>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: '#1E1E2E' }}>
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        <div className="px-4 pb-6">
          {/* CREAR NUEVO */}
          <p className="text-gray-500 text-[10px] font-semibold tracking-widest mb-3">CREAR NUEVO</p>
          <div className="grid grid-cols-3 gap-3 mb-6">
            {CREAR.map(item => (
              <button key={item.label} onClick={() => go(item.to)}
                className="rounded-2xl p-4 flex flex-col gap-2 text-left active:opacity-70"
                style={{ background: '#1A1A28', border: '1px solid #1E1E2E' }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl"
                  style={{ background: item.bg }}>
                  {item.emoji}
                </div>
                <span className="text-white text-[12px] font-semibold leading-tight">{item.label}</span>
                <span className="text-gray-500 text-[10px]">{item.desc}</span>
                <span style={{ color: '#3B82F6' }} className="text-[12px]">→</span>
              </button>
            ))}
          </div>

          {/* ACCIONES RÁPIDAS */}
          <p className="text-gray-500 text-[10px] font-semibold tracking-widest mb-3">ACCIONES RÁPIDAS</p>
          <div className="flex flex-col gap-2 mb-6">
            {[
              { emoji: '📋', label: 'Ver todos los presupuestos',   desc: 'Lista completa',             to: '/presupuestos',  color: '#3B82F6', bg: '#1A2A4A' },
              { emoji: '🏗',  label: 'Ver todas las obras',         desc: 'Estado y seguimiento',       to: '/obras',         color: '#F97316', bg: '#2A1A0A' },
              { emoji: '👥', label: 'Ir a Clientes',                desc: 'CRM y historial',            to: '/clientes',      color: '#14B8A6', bg: '#0A2A2A' },
              { emoji: '📊', label: 'Ver Estadísticas',             desc: 'Ganancia y valor hora',      to: '/estadisticas',  color: '#A855F7', bg: '#2A1A3A' },
              { emoji: '📋', label: 'Gestionar Plantillas',         desc: 'Crear y editar plantillas',  to: '/plantillas',    color: '#22C55E', bg: '#0A2A1A' },
            ].map(item => (
              <button key={item.label} onClick={() => go(item.to)}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 active:opacity-70"
                style={{ background: '#1A1A28', border: '1px solid #1E1E2E' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                  style={{ background: item.bg }}>
                  {item.emoji}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-white text-[13px] font-medium">{item.label}</p>
                  <p className="text-gray-500 text-[10px]">{item.desc}</p>
                </div>
                <ChevronRight size={14} className="text-gray-600 shrink-0" />
              </button>
            ))}
          </div>

          {/* DESDE PLANTILLA */}
          {plantillas.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-gray-500 text-[10px] font-semibold tracking-widest">DESDE PLANTILLA</p>
                <button onClick={() => go('/plantillas')} style={{ color: '#3B82F6' }} className="text-[12px]">Ver todas</button>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 mb-5">
                {plantillas.slice(0, 5).map(p => {
                  const total = (p.plantilla_items || []).reduce((s, it) => s + (it.precio || 0), 0)
                  return (
                    <div key={p.id} className="rounded-2xl p-3 min-w-[110px] flex flex-col gap-2 shrink-0"
                      style={{ background: '#1A1A28', border: '1px solid #1E1E2E' }}>
                      <span className="text-2xl">{p.emoji || '🔧'}</span>
                      <span className="text-white text-[11px] font-medium leading-tight">{p.nombre}</span>
                      <span className="text-gray-500 text-[9px]">{p.plantilla_items?.length || 0} ítems</span>
                      {total > 0 && <span className="text-gray-500 text-[9px]">${Number(total).toLocaleString('es-AR')}</span>}
                      <button onClick={() => usarPlantilla(p.id)}
                        className="text-[11px] font-semibold py-1.5 rounded-lg"
                        style={{ background: 'rgba(59,130,246,.2)', color: '#3B82F6' }}>
                        Usar
                      </button>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* IA banner */}
          <div className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: 'linear-gradient(135deg, rgba(109,40,217,.4), rgba(59,130,246,.3))', border: '1px solid rgba(109,40,217,.3)' }}>
            <span className="text-2xl shrink-0">✨</span>
            <div className="flex-1">
              <p className="text-white text-[13px] font-semibold">Creá más rápido con IA ✨</p>
              <p className="text-gray-400 text-[11px]">Describí el trabajo y la IA genera tu presupuesto</p>
            </div>
            <button onClick={() => go('/ia')}
              className="px-4 py-2 rounded-xl text-white text-[12px] font-bold shrink-0"
              style={{ background: '#7C3AED' }}>
              Próx.
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
