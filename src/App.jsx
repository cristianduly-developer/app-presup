import { useState, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { useAuth } from './lib/useAuth'
import { verificarSuscripcion } from './lib/useSuscripcion'
import { supabase } from './lib/supabase'
import { PlanContext } from './lib/PlanContext'
import BottomNav from './components/ui/BottomNav'
import CreateModal from './components/ui/CreateModal'
import Login from './pages/Login'
import SinAcceso from './pages/SinAcceso'
import Inicio from './pages/Inicio'
import Agenda from './pages/agenda/Agenda'
import Presupuestos from './pages/presupuestos/Presupuestos'
import NuevoPresupuesto from './pages/presupuestos/NuevoPresupuesto'
import DetallePresupuesto from './pages/presupuestos/DetallePresupuesto'
import Obras from './pages/obras/Obras'
import NuevaObra from './pages/obras/NuevaObra'
import DetalleObra from './pages/obras/DetalleObra'
import RegistroRapido from './pages/RegistroRapido'
import Mas from './pages/mas/Mas'
import Clientes from './pages/mas/Clientes'
import HistorialCliente from './pages/mas/HistorialCliente'
import Estadisticas from './pages/mas/Estadisticas'
import Plantillas from './pages/mas/Plantillas'
import Configuracion from './pages/mas/Configuracion'
import Reportes from './pages/mas/Reportes'
import LinkPublico from './pages/LinkPublico'
import PdfPresupuesto from './pages/presupuestos/PdfPresupuesto'

export default function App() {
  const { user, loading } = useAuth()
  const [showCreate, setShowCreate] = useState(false)
  const [suscripcion, setSuscripcion] = useState(null)
  const [checkingAcceso, setCheckingAcceso] = useState(false)
  const [notif, setNotif] = useState(null)
  const notifTimer = useRef(null)

  useEffect(() => {
    if (!user) return
    const canal = supabase.channel(`presupuestos-${user.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'presupuestos', filter: `user_id=eq.${user.id}` },
        payload => {
          if (payload.new?.status === 'aprobado' && payload.old?.status !== 'aprobado') {
            clearTimeout(notifTimer.current)
            setNotif({ mensaje: `¡Presupuesto #${payload.new.numero} aprobado por el cliente!`, id: payload.new.id })
            notifTimer.current = setTimeout(() => setNotif(null), 7000)
          }
        })
      .subscribe()
    return () => { supabase.removeChannel(canal); clearTimeout(notifTimer.current) }
  }, [user?.id])

  // Verificar suscripción cada vez que hay un usuario logueado
  useEffect(() => {
    if (!user) { setSuscripcion(null); return }
    setCheckingAcceso(true)
    verificarSuscripcion(user.email).then(result => {
      setSuscripcion(result)
      setCheckingAcceso(false)
    })
  }, [user?.id])

  if (loading || (user && checkingAcceso)) return <Splash />

  const tieneAcceso = !user ? false : suscripcion?.tiene_acceso === true

  const estadoSus     = suscripcion?.estado || null
  const diasRestantes = suscripcion?.dias_restantes ?? null
  const planRaw = suscripcion?.plan || 'basico'
  const plan    = (planRaw === 'sincargo' || planRaw === 'demo') ? 'profesional' : planRaw

  return (
    <BrowserRouter>
      <NotifBanner notif={notif} onClose={() => setNotif(null)} />
      <Routes>
        {/* link público y PDF — sin auth */}
        <Route path="/p/:token" element={<LinkPublico />} />
        <Route path="/presupuestos/:id/pdf" element={<PdfPresupuesto />} />

        {/* app autenticada */}
        <Route path="*" element={
          !user ? (
            <div className="flex flex-col h-full" style={{ background: '#0D0D14' }}>
              <Login />
            </div>
          ) : !tieneAcceso ? (
            <div className="flex flex-col h-full overflow-y-auto" style={{ background: '#0D0D14' }}>
              <SinAcceso estado={estadoSus} diasRestantes={diasRestantes} email={user.email} />
            </div>
          ) : (
            <PlanContext.Provider value={plan}>
            <div className="flex flex-col h-full relative">
              {estadoSus === 'demo' && diasRestantes != null && (
                <div className="text-center py-2 text-[11px] font-semibold z-50"
                  style={{ background: '#78350F', color: '#FCD34D' }}>
                  ⏳ Versión demo · vence en {diasRestantes} día{diasRestantes !== 1 ? 's' : ''}
                </div>
              )}
              <Routes>
                <Route path="/" element={<Inicio plan={plan} />} />
                <Route path="/agenda" element={<Agenda />} />
                <Route path="/presupuestos" element={<Presupuestos />} />
                <Route path="/presupuestos/nuevo" element={<NuevoPresupuesto />} />
                <Route path="/presupuestos/:id" element={<DetallePresupuesto />} />
                <Route path="/obras" element={<Obras />} />
                <Route path="/obras/nueva" element={<NuevaObra />} />
                <Route path="/obras/:id" element={<DetalleObra />} />
                <Route path="/registro" element={<RegistroRapido />} />
                <Route path="/mas" element={<Mas plan={plan} />} />
                <Route path="/clientes" element={<Clientes />} />
                <Route path="/clientes/:id" element={<HistorialCliente />} />
                <Route path="/estadisticas" element={<Estadisticas />} />
                <Route path="/plantillas" element={<Plantillas />} />
                <Route path="/configuracion" element={<Configuracion />} />
                <Route path="/reportes" element={<Reportes />} />
                <Route path="*" element={<PlaceholderPage />} />
              </Routes>
              <BottomNav onAdd={() => setShowCreate(true)} />
              {showCreate && (
                <>
                  <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setShowCreate(false)} />
                  <CreateModal onClose={() => setShowCreate(false)} />
                </>
              )}
            </div>
            </PlanContext.Provider>
          )
        } />
      </Routes>
    </BrowserRouter>
  )
}

function NotifBanner({ notif, onClose }) {
  const navigate = useNavigate()
  if (!notif) return null
  return (
    <div
      onClick={() => { navigate(`/presupuestos/${notif.id}`); onClose() }}
      className="fixed top-4 left-4 right-4 z-[200] rounded-2xl p-4 flex items-center gap-3 cursor-pointer"
      style={{ background: '#22C55E', boxShadow: '0 8px 32px rgba(34,197,94,.5)', maxWidth: 430, margin: '0 auto' }}>
      <span className="text-2xl">🎉</span>
      <p className="text-white font-bold text-[14px] flex-1">{notif.mensaje}</p>
      <button onClick={e => { e.stopPropagation(); onClose() }} className="text-white/70 text-[18px] leading-none">✕</button>
    </div>
  )
}

function Splash() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4" style={{ background: '#0D0D14' }}>
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
        style={{ background: '#3B82F6', boxShadow: '0 0 40px rgba(59,130,246,0.4)' }}>
        <span className="text-4xl">🔧</span>
      </div>
      <div className="w-8 h-8 border-2 rounded-full animate-spin"
        style={{ borderColor: 'rgba(59,130,246,0.3)', borderTopColor: '#3B82F6' }} />
    </div>
  )
}

function PlaceholderPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 pb-24" style={{ background: '#0D0D14' }}>
      <span className="text-5xl">🚧</span>
      <p className="text-white font-semibold">Próximamente</p>
      <p className="text-gray-500 text-sm">Esta pantalla está en desarrollo</p>
    </div>
  )
}
