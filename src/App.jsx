import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useAuth } from './lib/useAuth'
import BottomNav from './components/ui/BottomNav'
import CreateModal from './components/ui/CreateModal'
import Login from './pages/Login'
import Inicio from './pages/Inicio'
import Agenda from './pages/agenda/Agenda'
import Presupuestos from './pages/presupuestos/Presupuestos'
import NuevoPresupuesto from './pages/presupuestos/NuevoPresupuesto'
import DetallePresupuesto from './pages/presupuestos/DetallePresupuesto'
import Obras from './pages/obras/Obras'
import Mas from './pages/mas/Mas'
import Configuracion from './pages/mas/Configuracion'
import Reportes from './pages/mas/Reportes'
import Clientes from './pages/mas/Clientes'
import Estadisticas from './pages/mas/Estadisticas'
import DetalleObra from './pages/obras/DetalleObra'
import LinkPublico from './pages/LinkPublico'

export default function App() {
  const { user, loading } = useAuth()
  const [showCreate, setShowCreate] = useState(false)

  if (loading) return <Splash />

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
          ) : (
            <div className="flex flex-col h-full relative">
              <Routes>
                <Route path="/" element={<Inicio />} />
                <Route path="/agenda" element={<Agenda />} />
                <Route path="/presupuestos" element={<Presupuestos />} />
                <Route path="/presupuestos/nuevo" element={<NuevoPresupuesto />} />
                <Route path="/presupuestos/:id" element={<DetallePresupuesto />} />
                <Route path="/obras" element={<Obras />} />
                <Route path="/obras/:id" element={<DetalleObra />} />
                <Route path="/mas" element={<Mas />} />
                <Route path="/clientes" element={<Clientes />} />
                <Route path="/estadisticas" element={<Estadisticas />} />
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
