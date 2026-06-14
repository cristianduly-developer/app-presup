import { useNavigate } from 'react-router-dom'
import { BarChart2, Users, LayoutTemplate, Camera, Sparkles, Users2, CreditCard, Settings, FileBarChart } from 'lucide-react'
import { useAuth } from '../../lib/useAuth'

const TILES = [
  { icon: BarChart2,      label: 'Estadísticas',  color: 'bg-blue-600',   to: '/estadisticas' },
  { icon: Users,          label: 'Clientes',      color: 'bg-teal-600',   to: '/clientes' },
  { icon: LayoutTemplate, label: 'Plantillas',    color: 'bg-orange-600', to: '/plantillas' },
  { icon: Camera,         label: 'Trabajos',      color: 'bg-purple-600', to: '/obras', badge: null },
  { icon: Sparkles,       label: 'IA',            color: 'bg-violet-600', to: null, badge: 'PRONTO' },
  { icon: Users2,         label: 'Equipo',        color: 'bg-cyan-700',   to: null, badge: 'PRONTO' },
  { icon: CreditCard,     label: 'Suscripción',   color: 'bg-yellow-600', to: null, badge: 'PRONTO' },
  { icon: FileBarChart,   label: 'Reportes',      color: 'bg-green-700',  to: '/reportes' },
  { icon: Settings,       label: 'Configuración', color: 'bg-gray-600',   to: '/configuracion' },
]

export default function Mas() {
  const navigate = useNavigate()
  const { perfil } = useAuth()

  return (
    <div className="flex-1 overflow-y-auto pb-24 safe-top">
      <div className="px-5 pt-4 pb-3">
        <h1 className="text-white font-bold text-xl">Más</h1>
        <p className="text-gray-500 text-sm">Centro de control</p>
      </div>

      <div className="grid grid-cols-3 gap-3 px-4">
        {TILES.map(t => (
          <button
            key={t.label}
            onClick={() => t.to && navigate(t.to)}
            className="bg-surface-card rounded-2xl p-4 flex flex-col items-center gap-3 active:opacity-70 relative"
            style={!t.to ? { opacity: 0.5 } : {}}
          >
            {t.badge && (
              <span className="absolute top-2 right-2 bg-brand-blue text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                {t.badge}
              </span>
            )}
            <div className={`w-12 h-12 rounded-2xl ${t.color} flex items-center justify-center`}>
              <t.icon size={22} className="text-white" />
            </div>
            <span className="text-white text-xs font-medium text-center leading-tight">{t.label}</span>
          </button>
        ))}
      </div>

      {/* perfil rápido */}
      <div className="mx-4 mt-5 bg-surface-card rounded-2xl p-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-blue-700 flex items-center justify-center text-white font-bold text-lg shrink-0">
          {perfil?.nombre?.charAt(0)?.toUpperCase() || '?'}
        </div>
        <div className="flex-1">
          <p className="text-white font-semibold">{perfil?.nombre || 'Mi perfil'}</p>
          <p className="text-gray-500 text-xs">{[perfil?.oficio, perfil?.ciudad].filter(Boolean).join(' · ') || 'Completá tu perfil'}</p>
        </div>
        <button onClick={() => navigate('/configuracion')} className="text-gray-500">
          <Settings size={18} />
        </button>
      </div>

      <div className="mx-4 mt-3 bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-semibold text-sm">Plan Profesional</p>
            <p className="text-gray-400 text-xs">Vence el 20/06/2025</p>
          </div>
          <button onClick={() => navigate('/suscripcion')}
            className="bg-brand-blue text-white text-xs font-semibold px-4 py-2 rounded-xl">
            Ver plan
          </button>
        </div>
      </div>
    </div>
  )
}
