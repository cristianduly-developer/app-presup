import { useNavigate } from 'react-router-dom'
import { BarChart2, Users, LayoutTemplate, HardHat, Sparkles, Users2, FileBarChart, Settings, MessageCircle, LogOut, ChevronRight } from 'lucide-react'
import { useAuth } from '../../lib/useAuth'

const WA_SOPORTE = '5492235767784'

const TILES = [
  { icon: BarChart2,      label: 'Estadísticas',  color: '#2563EB', to: '/estadisticas' },
  { icon: Users,          label: 'Clientes',      color: '#0D9488', to: '/clientes' },
  { icon: LayoutTemplate, label: 'Plantillas',    color: '#EA580C', to: '/plantillas' },
  { icon: HardHat,        label: 'Trabajos',      color: '#7C3AED', to: '/obras' },
  { icon: Sparkles,       label: 'IA',            color: '#6D28D9', to: null, badge: 'PRONTO' },
  { icon: Users2,         label: 'Equipo',        color: '#0E7490', to: null, badge: 'PRONTO' },
  { icon: FileBarChart,   label: 'Reportes',      color: '#15803D', to: '/reportes' },
]

export default function Mas({ plan }) {
  const navigate = useNavigate()
  const { perfil, user, logout } = useAuth()

  const avatar = perfil?.nombre?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?'
  const foto = user?.user_metadata?.avatar_url

  const planLabel = plan === 'profesional' ? 'Profesional' : plan === 'premium' ? 'Premium' : 'Básico'
  const planColor = plan === 'profesional' ? '#3B82F6' : plan === 'premium' ? '#A855F7' : '#6B7280'

  const waMsg = encodeURIComponent(`Hola! Necesito soporte para App-presup. Mi email: ${user?.email}`)

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: '#0D0D14', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)', minHeight: '100vh' }}>

      {/* header usuario */}
      <div className="px-4 pt-12 pb-5 flex items-center justify-between">
        <div>
          <h1 className="text-white font-bold text-[20px]">Más</h1>
          <p className="text-gray-500 text-[13px]">Centro de control</p>
        </div>
        <div className="flex items-center gap-2">
          {foto
            ? <img src={foto} className="w-10 h-10 rounded-full object-cover" alt="avatar" />
            : <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">{avatar}</div>
          }
        </div>
      </div>

      {/* tiles */}
      <div className="grid grid-cols-4 gap-2 px-4 mb-4">
        {TILES.map(t => (
          <button key={t.label}
            onClick={() => t.to && navigate(t.to)}
            className="rounded-2xl p-3 flex flex-col items-center gap-1.5 active:opacity-70 relative"
            style={{ background: '#161622', border: '1px solid #1E1E2E', opacity: t.to ? 1 : 0.55 }}>
            {t.badge && (
              <span className="absolute top-1.5 right-1.5 text-white text-[7px] font-bold px-1 py-0.5 rounded-full"
                style={{ background: '#3B82F6' }}>
                {t.badge}
              </span>
            )}
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: t.color + '33' }}>
              <t.icon size={18} style={{ color: t.color }} />
            </div>
            <span className="text-white text-[11px] font-medium text-center leading-tight">{t.label}</span>
          </button>
        ))}
      </div>

      {/* panel cuenta */}
      <div className="mx-4 rounded-2xl overflow-hidden" style={{ background: '#161622', border: '1px solid #1E1E2E' }}>

        {/* nombre + plan */}
        <div className="flex items-center gap-3 px-4 py-4" style={{ borderBottom: '1px solid #1E1E2E' }}>
          {foto
            ? <img src={foto} className="w-12 h-12 rounded-full object-cover shrink-0" alt="avatar" />
            : <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg shrink-0">{avatar}</div>
          }
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-[15px] truncate">{perfil?.nombre || user?.email}</p>
            <p className="text-gray-500 text-[12px] truncate">{perfil?.oficio || ''}</p>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0"
            style={{ background: planColor + '22', color: planColor }}>
            {planLabel}
          </span>
        </div>

        {/* configuración */}
        <button onClick={() => navigate('/configuracion')}
          className="w-full flex items-center gap-3 px-4 py-3.5 active:opacity-70"
          style={{ borderBottom: '1px solid #1E1E2E' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#6B728022' }}>
            <Settings size={18} className="text-gray-400" />
          </div>
          <span className="flex-1 text-white text-[14px] text-left">Configuración</span>
          <ChevronRight size={16} className="text-gray-600" />
        </button>

        {/* ayuda */}
        <button onClick={() => { window.location.href = 'https://presupuestos.solucionesmdp.com.ar/ayuda' }}
          className="w-full flex items-center gap-3 px-4 py-3.5 active:opacity-70"
          style={{ borderBottom: '1px solid #1E1E2E' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#3B82F622' }}>
            <span className="text-lg">📖</span>
          </div>
          <span className="flex-1 text-white text-[14px] text-left">Centro de ayuda</span>
          <ChevronRight size={16} className="text-gray-600" />
        </button>

        {/* contactar soporte */}
        <a href={`https://wa.me/${WA_SOPORTE}?text=${waMsg}`}
          target="_blank" rel="noreferrer"
          className="flex items-center gap-3 px-4 py-3.5 active:opacity-70"
          style={{ borderBottom: '1px solid #1E1E2E' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#22C55E22' }}>
            <MessageCircle size={18} style={{ color: '#22C55E' }} />
          </div>
          <span className="flex-1 text-white text-[14px]">Contactar soporte</span>
          <ChevronRight size={16} className="text-gray-600" />
        </a>

        {/* cerrar sesión */}
        <button onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3.5 active:opacity-70">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#EF444422' }}>
            <LogOut size={18} style={{ color: '#EF4444' }} />
          </div>
          <span className="flex-1 text-[14px] text-left" style={{ color: '#EF4444' }}>Cerrar sesión</span>
        </button>
      </div>

    </div>
  )
}
