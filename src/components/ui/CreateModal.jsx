import { useNavigate } from 'react-router-dom'
import { X, FileText, HardHat, Calendar, ShoppingCart, DollarSign, Clock, MessageCircle, Link, LayoutTemplate, Camera, Sparkles, ChevronRight } from 'lucide-react'

const CREAR = [
  { emoji: '📋', label: 'Nuevo presupuesto',       desc: 'Crear presupuesto desde cero',         bg: '#1A3A6B', to: '/presupuestos/nuevo' },
  { emoji: '🏗',  label: 'Nueva obra',              desc: 'Crear obra directamente (sin presup.)', bg: '#2A1A0A', to: '/obras/nueva' },
  { emoji: '📅', label: 'Agenda visita',            desc: 'Agendar visita con cliente',            bg: '#2A1A3A', to: '/agenda/nueva' },
  { emoji: '🛒', label: 'Gasto de obra',            desc: 'Registrar gasto de una obra',           bg: '#2A1A0A', to: '/gastos/nuevo' },
  { emoji: '💰', label: 'Pago recibido',            desc: 'Registrar pago de cliente',             bg: '#0A2A1A', to: '/pagos/nuevo' },
  { emoji: '⏱',  label: 'Horas trabajadas',        desc: 'Registrar tiempo de trabajo',           bg: '#0A2A2A', to: '/horas/nuevo' },
]

const RAPIDAS = [
  { emoji: '💬', label: 'Enviar mensaje por WhatsApp',      desc: 'Envío rápido de presupuesto o saldo', bg: '#1A3A1A', color: '#22C55E' },
  { emoji: '🔗', label: 'Copiar link de presupuesto/obra', desc: 'Copiar link público para compartir',   bg: '#2A1A3A', color: '#A855F7' },
  { emoji: '📄', label: 'Plantilla de presupuesto',        desc: 'Usar una plantilla prediseñada',       bg: '#1A2A3A', color: '#3B82F6', badge: 'NUEVO' },
  { emoji: '📷', label: 'Agregar fotos a obra',            desc: 'Subir fotos del avance de obra',       bg: '#2A1A0A', color: '#F97316' },
]

const PLANTILLAS = [
  { emoji: '💧', label: 'Cambio de\ntermotanque',   items: 8,  usos: 32, color: '#3B82F6' },
  { emoji: '⚡', label: 'Instalación\neléctrica',   items: 12, usos: 18, color: '#EAB308' },
  { emoji: '🔧', label: 'Instalación\nde gas',      items: 10, usos: 14, color: '#22C55E' },
  { emoji: '❄️', label: 'Aire\nacondicionado',      items: 9,  usos: 10, color: '#F97316' },
]

export default function CreateModal({ onClose }) {
  const navigate = useNavigate()
  function go(to) { onClose(); navigate(to) }

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
            {RAPIDAS.map(item => (
              <button key={item.label}
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
                {item.badge && (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: '#3B82F6', color: '#fff' }}>
                    {item.badge}
                  </span>
                )}
                <ChevronRight size={14} className="text-gray-600 shrink-0" />
              </button>
            ))}
          </div>

          {/* DESDE PLANTILLA */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-gray-500 text-[10px] font-semibold tracking-widest">DESDE PLANTILLA</p>
            <button style={{ color: '#3B82F6' }} className="text-[12px]">Ver todas</button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 mb-5">
            {PLANTILLAS.map(p => (
              <div key={p.label} className="rounded-2xl p-3 min-w-[110px] flex flex-col gap-2 shrink-0"
                style={{ background: '#1A1A28', border: '1px solid #1E1E2E' }}>
                <span className="text-2xl">{p.emoji}</span>
                <span className="text-white text-[11px] font-medium leading-tight whitespace-pre-line">{p.label}</span>
                <span className="text-gray-500 text-[9px]">{p.items} ítems</span>
                <span className="text-gray-500 text-[9px]">Usada {p.usos} veces</span>
                <button className="text-[11px] font-semibold py-1.5 rounded-lg"
                  style={{ background: p.color + '22', color: p.color }}>
                  Usar
                </button>
              </div>
            ))}
          </div>

          {/* IA banner */}
          <div className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: 'linear-gradient(135deg, rgba(109,40,217,.4), rgba(59,130,246,.3))', border: '1px solid rgba(109,40,217,.3)' }}>
            <span className="text-2xl shrink-0">✨</span>
            <div className="flex-1">
              <p className="text-white text-[13px] font-semibold">Creá más rápido con IA ✨</p>
              <p className="text-gray-400 text-[11px]">Describí el trabajo y la IA genera tu presupuesto</p>
            </div>
            <button className="px-4 py-2 rounded-xl text-white text-[12px] font-bold shrink-0"
              style={{ background: '#7C3AED' }}>
              Probar ahora
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
