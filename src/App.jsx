import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react'
import * as Sentry from '@sentry/react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { useAuth } from './lib/useAuth'
import { verificarSuscripcion } from './lib/useSuscripcion'
import { supabase } from './lib/supabase'
import { invalidarCacheObras } from './lib/useObras'

const WA_SOPORTE = '5492236965481'
import { PlanContext } from './lib/PlanContext'
import BottomNav from './components/ui/BottomNav'
import Sidebar from './components/ui/Sidebar'
import CreateModal from './components/ui/CreateModal'
import ErrorBoundary from './components/ui/ErrorBoundary'
import UpdatePrompt from './components/ui/UpdatePrompt'
import Onboarding from './pages/Onboarding'
import Login from './pages/Login'

const Inicio              = lazy(() => import('./pages/Inicio'))
const Agenda              = lazy(() => import('./pages/agenda/Agenda'))
const Presupuestos        = lazy(() => import('./pages/presupuestos/Presupuestos'))
const NuevoPresupuesto    = lazy(() => import('./pages/presupuestos/NuevoPresupuesto'))
const DetallePresupuesto  = lazy(() => import('./pages/presupuestos/DetallePresupuesto'))
const PdfPresupuesto      = lazy(() => import('./pages/presupuestos/PdfPresupuesto'))
const Obras               = lazy(() => import('./pages/obras/Obras'))
const NuevaObra           = lazy(() => import('./pages/obras/NuevaObra'))
const DetalleObra         = lazy(() => import('./pages/obras/DetalleObra'))
const RegistroRapido      = lazy(() => import('./pages/RegistroRapido'))
const Mas                 = lazy(() => import('./pages/mas/Mas'))
const Clientes            = lazy(() => import('./pages/mas/Clientes'))
const HistorialCliente    = lazy(() => import('./pages/mas/HistorialCliente'))
const Estadisticas        = lazy(() => import('./pages/mas/Estadisticas'))
const Plantillas          = lazy(() => import('./pages/mas/Plantillas'))
const Configuracion       = lazy(() => import('./pages/mas/Configuracion'))
const Reportes            = lazy(() => import('./pages/mas/Reportes'))
const MiPlan              = lazy(() => import('./pages/mas/MiPlan'))
const LinkPublico         = lazy(() => import('./pages/LinkPublico'))

export default function App() {
  const { user, loading, perfil } = useAuth()
  const [showCreate, setShowCreate] = useState(false)
  const [suscripcion, setSuscripcion] = useState(null)
  const [checkingAcceso, setCheckingAcceso] = useState(false)
  const [notif, setNotif] = useState(null)
  const notifTimer  = useRef(null)
  const notifVistos = useRef(new Set())

  useEffect(() => {
    if (!user) return
    const canal = supabase.channel(`presupuestos-${user.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'presupuestos', filter: `user_id=eq.${user.id}` },
        payload => {
          const id = payload.new?.id
          if (payload.new?.status === 'aprobado' && payload.old?.status !== 'aprobado' && !notifVistos.current.has(id)) {
            notifVistos.current.add(id)
            clearTimeout(notifTimer.current)
            setNotif({ mensaje: `¡Presupuesto #${payload.new.numero} aprobado por el cliente!`, id })
            notifTimer.current = setTimeout(() => setNotif(null), 7000)
            invalidarCacheObras()
          }
        })
      .subscribe()
    return () => { supabase.removeChannel(canal); clearTimeout(notifTimer.current) }
  }, [user?.id])

  // Verificar suscripción cada vez que hay un usuario logueado
  const verificar = useCallback(() => {
    if (!user) { setSuscripcion(null); setCheckingAcceso(false); return }
    setCheckingAcceso(true)
    verificarSuscripcion().then(result => {
      setSuscripcion(result)
      setCheckingAcceso(false)
    })
  }, [user?.id])

  useEffect(() => { verificar() }, [verificar])

  // Contar sesión real al hacer login (SIGNED_IN)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') verificarSuscripcion({ esLogin: true }).catch(() => {})
    })
    return () => subscription.unsubscribe()
  }, [])

  // Re-verificar suscripción cada 5 minutos (mantiene ultimo_acceso actualizado en el SaaS)
  useEffect(() => {
    if (!user) return
    const interval = setInterval(verificar, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [user?.id])

  const [onboardingVisto, setOnboardingVisto] = useState(
    () => !!localStorage.getItem('onboarding_seen')
  )

  if (loading || (user && checkingAcceso)) return <Splash />

  const tieneAcceso   = !user ? false : suscripcion?.tiene_acceso === true
  const estadoSus     = suscripcion?.estado || null
  const diasRestantes = suscripcion?.dias_restantes ?? null
  const orgIdBloqueo  = suscripcion?.org_id || suscripcion?.ret_org_id || null
  const planRaw       = suscripcion?.plan || 'basico'
  // demo y trial tienen los mismos features que profesional
  const plan          = (planRaw === 'demo' || planRaw === 'trial' || planRaw === 'sincargo') ? 'profesional' : planRaw

  const nombreUsuario = user?.user_metadata?.full_name?.split(' ')[0]
    || user?.email?.split('@')[0]
    || 'ahí'

  function finalizarOnboarding() {
    localStorage.setItem('onboarding_seen', '1')
    setOnboardingVisto(true)
  }

  // Determine which no-access screen to show
  const pantalla = !tieneAcceso
    ? (suscripcion === null
        ? 'registro'
        : (estadoSus === 'demo' && (diasRestantes ?? 0) <= 0)
          ? 'demo_vencido'
          : (estadoSus === 'impago' || estadoSus === 'suspendido' || estadoSus === 'cancelado')
            ? 'suspendido'
            : 'registro')
    : 'app'

  return (
    <BrowserRouter>
      <ToastBanner />
      <NotifBanner notif={notif} onClose={() => setNotif(null)} />
      <UpdatePrompt />
      <ErrorBoundary>
      <Suspense fallback={<Splash />}>
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
          ) : pantalla === 'registro' ? (
            <div className="flex flex-col h-full overflow-y-auto" style={{ background: '#0D0D14' }}>
              <PantallaRegistro email={user.email} onRegistrado={verificar} />
            </div>
          ) : pantalla === 'demo_vencido' ? (
            <div className="flex flex-col h-full overflow-y-auto" style={{ background: '#0D0D14' }}>
              <PantallaDemoVencido email={user.email} orgId={orgIdBloqueo} />
            </div>
          ) : pantalla === 'suspendido' ? (
            <div className="flex flex-col h-full overflow-y-auto" style={{ background: '#0D0D14' }}>
              <PantallaSuspendida email={user.email} estado={estadoSus} orgId={orgIdBloqueo} />
            </div>
          ) : !onboardingVisto && !perfil?.nombre ? (
            <div className="flex flex-col h-full overflow-y-auto" style={{ background: '#0D0D14' }}>
              <Onboarding
                nombre={nombreUsuario}
                diasRestantes={diasRestantes}
                onFinalizar={finalizarOnboarding}
              />
            </div>
          ) : (
            <PlanContext.Provider value={plan}>
            <div className="flex h-full relative">
              <Sidebar plan={plan} estadoSus={estadoSus} diasRestantes={diasRestantes} />
              <div className="flex flex-col flex-1 min-w-0 relative">
              {estadoSus === 'demo' && diasRestantes != null && (
                <div className="text-center py-2 text-[11px] font-semibold z-50 md:hidden"
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
                <Route path="/miplan" element={<MiPlan />} />
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
            </div>
            </PlanContext.Provider>
          )
        } />
      </Routes>
      </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  )
}

function ToastBanner() {
  const [toast, setToast] = useState(null)
  const timerRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      clearTimeout(timerRef.current)
      setToast(e.detail)
      timerRef.current = setTimeout(() => setToast(null), 4000)
    }
    window.addEventListener('app:toast', handler)
    return () => { window.removeEventListener('app:toast', handler); clearTimeout(timerRef.current) }
  }, [])

  if (!toast) return null
  const isError = toast.type === 'error'
  return (
    <div className="fixed top-4 left-4 right-4 z-[300] rounded-2xl px-4 py-3 flex items-center gap-3"
      style={{
        background: isError ? '#EF4444' : '#22C55E',
        boxShadow: `0 8px 32px ${isError ? 'rgba(239,68,68,.4)' : 'rgba(34,197,94,.4)'}`,
        maxWidth: 430, margin: '0 auto',
      }}>
      <span className="text-xl">{isError ? '⚠️' : '✓'}</span>
      <p className="text-white font-semibold text-[13px] flex-1">{toast.msg}</p>
      <button onClick={() => setToast(null)} className="text-white/70 text-lg leading-none">✕</button>
    </div>
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

function PantallaRegistro({ email, onRegistrado }) {
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  async function empezarDemo() {
    setCargando(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('no_auth')

      const res = await fetch('/api/registrar-demo', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'error_servidor')

      // Reintentar verificación hasta 5 veces con espera entre intentos
      // (el central SaaS puede tardar unos segundos en estar disponible)
      for (let i = 0; i < 5; i++) {
        await new Promise(r => setTimeout(r, 1500))
        const result = await import('./lib/useSuscripcion').then(m => m.verificarSuscripcion())
        if (result?.tiene_acceso) { onRegistrado(); return }
      }

      // Si después de los reintentos sigue sin acceso, avisar
      setError('El acceso tardó más de lo esperado. Intentá recargar la página.')
      setCargando(false)
    } catch (e) {
      setError(e.message === 'no_auth' ? 'Sesión expirada, volvé a ingresar.' : 'Ocurrió un error. Intentá de nuevo.')
      setCargando(false)
    }
  }

  return (
    <div className="flex flex-col min-h-full pb-12 px-5">
      <div className="flex flex-col items-center pt-16 pb-8 text-center">
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-5"
          style={{ background: 'rgba(59,130,246,.15)', border: '2px solid rgba(59,130,246,.4)' }}>
          <span className="text-5xl">🔧</span>
        </div>
        <h1 className="text-white font-bold text-[26px] mb-2">Probá App Presup</h1>
        <p className="text-gray-400 text-[14px] max-w-xs">
          28 días gratis con todas las funciones del plan Profesional. Sin tarjeta de crédito.
        </p>
      </div>

      <div className="flex flex-col gap-3 mb-8">
        {[
          { icon: '📋', texto: 'Presupuestos ilimitados por 28 días' },
          { icon: '🏗', texto: 'Gestión completa de obras y clientes' },
          { icon: '📄', texto: 'Exportación a PDF' },
          { icon: '💬', texto: 'Enviá por WhatsApp con un toque' },
          { icon: '📊', texto: 'Estadísticas y reportes detallados' },
        ].map(f => (
          <div key={f.texto} className="flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
            <span className="text-xl">{f.icon}</span>
            <span className="text-gray-300 text-[13px]">{f.texto}</span>
            <span className="ml-auto text-green-400 text-[12px] font-bold">✓</span>
          </div>
        ))}
      </div>

      <button
        onClick={empezarDemo}
        disabled={cargando}
        className="w-full py-4 rounded-2xl font-bold text-[16px] text-white transition-all active:opacity-80 disabled:opacity-60"
        style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)', boxShadow: '0 4px 20px rgba(59,130,246,0.4)' }}>
        {cargando ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Activando prueba...
          </span>
        ) : 'Empezar prueba gratis'}
      </button>

      {error && <p className="text-red-400 text-[12px] text-center mt-3">{error}</p>}

      <button onClick={() => supabase.auth.signOut()}
        className="text-gray-600 text-[11px] underline text-center mx-auto block mt-6">
        Cerrar sesión ({email})
      </button>
    </div>
  )
}

function SelectorPlanesMP({ orgId, titulo, subtitulo, emoji, onSignOut }) {
  const [planes,   setPlanes]   = useState([])
  const [planSel,  setPlanSel]  = useState('profesional')
  const [cargando, setCargando] = useState(false)
  const [error,    setError]    = useState('')

  useEffect(() => {
    fetch('/api/planes-precios').then(r => r.json()).then(d => {
      if (d.planes?.length) {
        const metas = {
          basico:      { label: 'Básico',      color: '#6B7280', emoji: '🔩' },
          profesional: { label: 'Profesional', color: '#3B82F6', emoji: '⚡' },
          premium:     { label: 'Premium',     color: '#A855F7', emoji: '🚀' },
        }
        const ordenados = ['basico', 'profesional', 'premium'].map(id => {
          const row = d.planes.find(p => p.plan === id)
          if (!row) return null
          return { id, ...metas[id], precio: '$' + Number(row.precio_mensual).toLocaleString('es-AR'), beneficios: row.beneficios || [] }
        }).filter(Boolean)
        setPlanes(ordenados)
      }
    }).catch(() => {})
  }, [])

  const pagar = async () => {
    if (!orgId) { setError('No se encontró tu organización. Intentá de nuevo.'); return }
    setCargando(true); setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const r = await fetch('/api/mp-pago-publico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ plan: planSel }),
      })
      const data = await r.json()
      if (!r.ok || !data.init_point) { setError(data.error || 'Error al iniciar el pago.'); setCargando(false); return }
      window.location.href = data.init_point
    } catch { setError('Error de conexión. Intentá de nuevo.'); setCargando(false) }
  }

  const planInfo = planes.find(p => p.id === planSel)

  return (
    <div className="flex flex-col min-h-full pb-12 px-5 pt-10" style={{ background: '#0D0D14' }}>
      <div className="text-center mb-6">
        <div className="text-5xl mb-3">{emoji}</div>
        <h1 className="text-white font-bold text-[20px] mb-2">{titulo}</h1>
        <p className="text-gray-400 text-[13px] max-w-xs mx-auto">{subtitulo}</p>
      </div>

      {planes.map(p => (
        <div key={p.id} onClick={() => setPlanSel(p.id)}
          className="rounded-2xl p-4 mb-3 cursor-pointer transition-all"
          style={{ border: `2px solid ${planSel === p.id ? p.color : '#1E1E2E'}`, background: planSel === p.id ? p.color + '12' : '#161622' }}>
          <div className="flex justify-between items-center mb-1">
            <span className="font-bold text-[15px]" style={{ color: p.color }}>{p.emoji} {p.label}</span>
            <span className="font-black text-white text-[15px]">{p.precio}<span className="text-gray-500 font-normal text-[11px]">/mes</span></span>
          </div>
          {p.beneficios?.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1">
              {p.beneficios.map((b, i) => (
                <li key={i} className="text-[11px] text-gray-400 flex items-center gap-1.5">
                  <span style={{ color: p.color }}>✓</span>{b}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}

      <div className="rounded-xl p-3 mb-4 text-[11px] text-blue-300"
        style={{ background: 'rgba(59,130,246,.08)', border: '1px solid rgba(59,130,246,.2)' }}>
        💳 El pago se procesa por <strong>Mercado Pago</strong>. Se renueva automáticamente cada mes.
      </div>

      {error && <p className="text-red-400 text-[12px] mb-3 text-center">{error}</p>}

      <button onClick={pagar} disabled={cargando || !planInfo}
        className="w-full py-4 rounded-2xl font-bold text-[15px] text-white mb-3 disabled:opacity-60"
        style={{ background: cargando ? '#1E2A3A' : 'linear-gradient(135deg,#3B82F6,#2563EB)' }}>
        {cargando ? 'Redirigiendo...' : `Suscribirme — Plan ${planInfo?.label ?? planSel}`}
      </button>

      <button onClick={onSignOut} className="text-gray-600 text-[11px] underline text-center mx-auto block">
        Volver al inicio de sesión
      </button>
    </div>
  )
}

function PantallaDemoVencido({ email, orgId }) {
  return (
    <SelectorPlanesMP
      orgId={orgId}
      titulo="Tu prueba gratuita venció"
      subtitulo="Activá un plan para seguir gestionando tus presupuestos y obras."
      emoji="⏳"
      onSignOut={() => supabase.auth.signOut()}
    />
  )
}

function PantallaSuspendida({ email, estado, orgId }) {
  const titulo = estado === 'impago' ? 'Suscripción vencida'
    : estado === 'cancelado' ? 'Suscripción cancelada'
    : 'Cuenta suspendida'
  const subtitulo = estado === 'impago' ? 'Regularizá tu pago para reactivar el acceso.'
    : estado === 'cancelado' ? 'Tu suscripción fue cancelada. Elegí un plan para volver a acceder.'
    : 'Reactivá tu suscripción para recuperar el acceso.'
  return (
    <SelectorPlanesMP
      orgId={orgId}
      titulo={titulo}
      subtitulo={subtitulo}
      emoji={estado === 'impago' ? '💳' : estado === 'cancelado' ? '📋' : '🔒'}
      onSignOut={() => supabase.auth.signOut()}
    />
  )
}
