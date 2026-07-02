import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react'
import { useAuth } from '../../lib/useAuth'
import { supabase } from '../../lib/supabase'

const PLAN_COLOR = { basico: '#6B7280', profesional: '#3B82F6', premium: '#A855F7' }
const PLAN_LABEL = { basico: 'Básico', profesional: 'Profesional', premium: 'Premium', sincargo: 'Sin cargo', demo: 'Demo' }

export default function MiPlan() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [suscripcion, setSuscripcion] = useState(null)
  const [planes, setPlanes] = useState([])
  const [loading, setLoading] = useState(true)
  const [accion, setAccion] = useState(null) // 'upgrade' | 'cancel' | null
  const [planSeleccionado, setPlanSeleccionado] = useState(null)
  const [procesando, setProcesando] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    cargar()
  }, [])

  const cargar = async () => {
    setLoading(true)
    try {
      const [{ data: { session } }, planesRes] = await Promise.all([
        supabase.auth.getSession(),
        fetch('/api/planes-precios'),
      ])
      const planesData = await planesRes.json()
      setPlanes(planesData.planes || [])

      if (session?.access_token) {
        const r = await fetch('/api/verificar-acceso', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        const d = await r.json()
        setSuscripcion(d)
      }
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const iniciarPago = async (plan) => {
    setProcesando(true)
    setMsg(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const r = await fetch('/api/mp-crear-suscripcion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ plan }),
      })
      const d = await r.json()
      if (d.init_point) {
        window.location.href = d.init_point
      } else {
        setMsg({ tipo: 'error', texto: d.error || 'No se pudo iniciar el pago.' })
      }
    } catch {
      setMsg({ tipo: 'error', texto: 'Error al conectar con el servicio de pagos.' })
    }
    setProcesando(false)
  }

  const cancelarSuscripcion = async () => {
    setProcesando(true)
    setMsg(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const r = await fetch('/api/mp-cancelar-suscripcion', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const d = await r.json()
      if (r.ok) {
        setMsg({ tipo: 'ok', texto: 'Suscripción cancelada. Tu acceso continúa hasta el vencimiento.' })
        setAccion(null)
        await cargar()
      } else {
        setMsg({ tipo: 'error', texto: d.error || 'No se pudo cancelar.' })
      }
    } catch {
      setMsg({ tipo: 'error', texto: 'Error al cancelar.' })
    }
    setProcesando(false)
  }

  const planActual = suscripcion?.plan || suscripcion?.ret_plan || 'basico'
  const estado = suscripcion?.estado || suscripcion?.ret_estado || null
  const vencimiento = suscripcion?.fecha_vencimiento || suscripcion?.ret_fecha_vencimiento || null
  const planColor = PLAN_COLOR[planActual] || '#6B7280'

  return (
    <div style={{ background: '#0D0D14', minHeight: '100vh', paddingBottom: 40 }}>
      {/* header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-5">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#161622' }}>
          <ArrowLeft size={18} className="text-gray-400" />
        </button>
        <h1 className="text-white font-bold text-[18px]">Mi suscripción</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="px-4 space-y-4">

          {/* estado actual */}
          <div className="rounded-2xl p-5" style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">Plan actual</p>
            <div className="flex items-center justify-between">
              <span className="text-white font-bold text-2xl">{PLAN_LABEL[planActual] || planActual}</span>
              <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: planColor + '22', color: planColor }}>
                {estado === 'activo' ? 'Activo' : estado === 'demo' ? 'Demo' : estado === 'cancelado' ? 'Cancelado' : estado || '—'}
              </span>
            </div>
            {vencimiento && (
              <p className="text-gray-500 text-xs mt-2">Vence: {new Date(vencimiento).toLocaleDateString('es-AR')}</p>
            )}
          </div>

          {msg && (
            <div className={`flex items-center gap-2 rounded-xl p-3 text-sm ${msg.tipo === 'ok' ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
              {msg.tipo === 'ok' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
              {msg.texto}
            </div>
          )}

          {/* planes */}
          {planes.length > 0 && (
            <div className="space-y-3">
              <p className="text-gray-400 text-xs uppercase tracking-wider">Planes disponibles</p>
              {planes.map(p => {
                const color = PLAN_COLOR[p.plan] || '#6B7280'
                const esActual = p.plan === planActual && estado === 'activo'
                return (
                  <div key={p.plan} className="rounded-2xl p-4" style={{ background: '#161622', border: `1px solid ${esActual ? color : '#1E1E2E'}` }}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-white font-bold text-[16px]">{PLAN_LABEL[p.plan] || p.plan}</p>
                        <p style={{ color }} className="font-bold text-xl">${p.precio_mensual?.toLocaleString('es-AR')}<span className="text-gray-500 text-sm font-normal">/mes</span></p>
                      </div>
                      {esActual ? (
                        <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: color + '22', color }}>Tu plan</span>
                      ) : (
                        <button
                          onClick={() => iniciarPago(p.plan)}
                          disabled={procesando}
                          className="px-4 py-2 rounded-xl text-white text-sm font-semibold active:opacity-70 disabled:opacity-50"
                          style={{ background: color }}>
                          {procesando ? '...' : 'Suscribirse'}
                        </button>
                      )}
                    </div>
                    {Array.isArray(p.beneficios) && p.beneficios.length > 0 && (
                      <ul className="space-y-1">
                        {p.beneficios.map((b, i) => (
                          <li key={i} className="flex items-center gap-2 text-gray-300 text-sm">
                            <CheckCircle2 size={13} style={{ color, flexShrink: 0 }} />
                            {b}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* cancelar */}
          {estado === 'activo' && planActual !== 'sincargo' && (
            <div className="rounded-2xl p-4" style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
              {accion === 'cancel' ? (
                <div>
                  <p className="text-white font-semibold mb-1">¿Cancelar suscripción?</p>
                  <p className="text-gray-400 text-sm mb-4">Tu acceso continúa hasta el vencimiento. No se realizarán más cobros.</p>
                  <div className="flex gap-3">
                    <button onClick={() => setAccion(null)} className="flex-1 py-2 rounded-xl text-gray-300 text-sm" style={{ background: '#1E1E2E' }}>
                      Volver
                    </button>
                    <button onClick={cancelarSuscripcion} disabled={procesando} className="flex-1 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50" style={{ background: '#EF4444' }}>
                      {procesando ? 'Cancelando...' : 'Sí, cancelar'}
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setAccion('cancel')} className="w-full text-center text-sm py-1" style={{ color: '#EF4444' }}>
                  Cancelar suscripción
                </button>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  )
}
