import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/useAuth'

const NAV_ITEMS = [
  { to: '/',               label: 'Inicio',         emoji: '🏠' },
  { to: '/presupuestos',   label: 'Presupuestos',   emoji: '📋' },
  { to: '/obras',          label: 'Obras',          emoji: '🏗' },
  { to: '/agenda',         label: 'Agenda',         emoji: '📅' },
  { to: '/clientes',       label: 'Clientes',       emoji: '👥' },
  { to: '/registro',       label: 'Registro rápido',emoji: '🧾' },
  { to: '/estadisticas',   label: 'Estadísticas',   emoji: '📊' },
  { to: '/reportes',       label: 'Reportes',       emoji: '📈' },
  { to: '/configuracion',  label: 'Configuración',  emoji: '⚙️' },
]

export default function Sidebar({ plan, estadoSus, diasRestantes }) {
  const { perfil, user, logout } = useAuth()
  const navigate = useNavigate()

  const nombre = perfil?.nombre || user?.user_metadata?.full_name || user?.email?.split('@')[0] || ''
  const inicial = nombre.charAt(0).toUpperCase() || '?'

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  return (
    <aside className="hidden md:flex w-60 flex-col h-screen sticky top-0 shrink-0"
      style={{ background: '#13131E', borderRight: '1px solid #1E1E2E' }}>

      {/* banner demo */}
      {estadoSus === 'demo' && diasRestantes != null && (
        <div className="text-center py-2 text-[11px] font-semibold"
          style={{ background: '#78350F', color: '#FCD34D' }}>
          ⏳ Modo demo — quedan {diasRestantes} día{diasRestantes !== 1 ? 's' : ''}
        </div>
      )}

      {/* perfil */}
      <div className="p-4 flex items-center gap-3" style={{ borderBottom: '1px solid #1E1E2E' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
          style={{ background: '#3B82F6' }}>
          {inicial}
        </div>
        <div className="min-w-0">
          <p className="text-white text-sm font-bold truncate">{nombre || 'Mi perfil'}</p>
          <p className="text-gray-500 text-xs capitalize">{perfil?.oficio || plan || 'Usuario'}</p>
        </div>
      </div>

      {/* nav */}
      <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-0.5">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`
            }
            style={({ isActive }) => isActive ? { background: '#3B82F6' } : {}}
          >
            <span className="text-base">{item.emoji}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* ayuda + cerrar sesión */}
      <div className="p-3" style={{ borderTop: '1px solid #1E1E2E' }}>
        <button
          onClick={() => { window.location.href = 'https://presupuestos.solucionesmdp.com.ar/ayuda' }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all mb-0.5">
          <span className="text-base">📖</span>
          Ayuda
        </button>
        <a href="https://wa.me/5492236965481" target="_blank" rel="noreferrer"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all mb-0.5"
          style={{ textDecoration: 'none' }}>
          <span className="text-base">💬</span>
          Soporte
        </a>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all">
          <span className="text-base">🚪</span>
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
