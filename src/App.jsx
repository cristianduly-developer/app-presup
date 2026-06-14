import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useAuth } from './lib/useAuth'
import { verificarSuscripcion } from './lib/useSuscripcion'
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

export default function App() {
  const { user, loading } = useAuth()
  const [showCreate, setShowCreate] = useState(false)
  const [suscripcion, setSuscripcion] = useState(null)   // null = no verificado aún
  const [checkingAcceso, setCheckingAcceso] = useState(false)

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

  // El admin siempre tiene acceso
  const esAdmin = user?.email === 'cristianduly@gmail.com'

  // Determinar si tiene acceso
  const tieneAcceso = !user ? false
    : esAdmin ? true
    : suscripcion?.tiene_acceso === true

  // Estado de la suscripción para mostrar advertencias
  const estadoSus  = suscripcion?.estado || null
  const diasRestantes = suscripcion?.dias_restantes ?? null
  const plan       = esAdmin ? 'premium' : (suscripcion?.plan || 'basico')

  return (
    <BrowserRouter>
      <Routes>
        {/* link público — sin auth */}
        <Route path="/p/:token" element={<LinkPublico />} />

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
            <div className="flex flex-col h-full relative">
              {/* banner demo si quedan pocos días */}
              {estadoSus === 'demo' && diasRestantes != null && diasRestantes <= 3 && (
                <div className="text-center py-2 text-[11px] font-semibold z-50"
                  style={{ background: '#78350F', color: '#FCD34D' }}>
                  ⚠️ Demo vence en {diasRestantes} día{diasRestantes !== 1 ? 's' : ''}
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
          )
        } />
      </Routes>
    </BrowserRouter>
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
