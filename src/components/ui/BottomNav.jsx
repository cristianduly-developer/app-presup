import { NavLink, useLocation } from 'react-router-dom'
import { Home, Calendar, FileText, HardHat, MoreHorizontal, Plus } from 'lucide-react'

const TABS = [
  { to: '/',             Icon: Home,           label: 'Inicio' },
  { to: '/agenda',       Icon: Calendar,       label: 'Agenda' },
  null, // botón central
  { to: '/presupuestos', Icon: FileText,        label: 'Presupuestos' },
  { to: '/obras',        Icon: HardHat,         label: 'Obras' },
  { to: '/mas',          Icon: MoreHorizontal,  label: 'Más' },
]

export default function BottomNav({ onAdd }) {
  const location = useLocation()

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50"
      style={{
        background: '#13131E',
        borderTop: '1px solid #1E1E2E',
        paddingBottom: 'env(safe-area-inset-bottom, 8px)',
      }}>
      <div className="flex items-end justify-around px-2 pt-2 pb-1">
        {TABS.map((tab, i) => {
          // botón + central
          if (tab === null) {
            return (
              <div key="add" className="flex flex-col items-center flex-1 pb-1">
                <button
                  onClick={onAdd}
                  className="w-[56px] h-[56px] -mt-7 rounded-full flex items-center justify-center shadow-xl"
                  style={{ background: '#3B82F6', boxShadow: '0 0 20px rgba(59,130,246,0.5)' }}>
                  <Plus size={26} color="#fff" />
                </button>
              </div>
            )
          }

          const active = location.pathname === tab.to
            || (tab.to !== '/' && location.pathname.startsWith(tab.to))

          return (
            <NavLink key={tab.to} to={tab.to}
              className="flex flex-col items-center gap-1 flex-1 py-1">
              <tab.Icon
                size={22}
                color={active ? '#3B82F6' : '#4B5563'}
              />
              <span className="text-[10px]"
                style={{ color: active ? '#3B82F6' : '#4B5563' }}>
                {tab.label}
              </span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
