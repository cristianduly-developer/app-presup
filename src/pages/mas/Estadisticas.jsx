import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { usePlan, tieneFeature } from '../../lib/PlanContext'

function fmt(n) { return '$' + Number(n || 0).toLocaleString('es-AR') }

export default function Estadisticas() {
  const navigate = useNavigate()
  const plan = usePlan()
  const [datos, setDatos] = useState(null)
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('mes')

  useEffect(() => {
    if (tieneFeature(plan, 'estadisticas')) cargar()
  }, [periodo, plan])

  async function cargar() {
    setLoading(true)
    const ahora = new Date()
    let desde
    if (periodo === 'semana') desde = new Date(ahora - 7 * 86400000)
    else if (periodo === 'mes') desde = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
    else desde = new Date(ahora.getFullYear(), 0, 1)

    const desdeStr = desde.toISOString()

    const [{ data: obras }, { data: presups }, { data: pagosData }, { data: gastosData }, { data: horasData }] = await Promise.all([
      supabase.from('obras').select('total, status, ganancia_neta').gte('created_at', desdeStr),
      supabase.from('presupuestos').select('total, status').gte('created_at', desdeStr),
      supabase.from('pagos').select('monto').gte('created_at', desdeStr),
      supabase.from('gastos').select('monto').gte('created_at', desdeStr),
      supabase.from('horas').select('cantidad').gte('created_at', desdeStr),
    ])

    const totalFacturado = (presups || []).reduce((s, p) => s + (p.total || 0), 0)
    const totalCobrado   = (pagosData || []).reduce((s, p) => s + p.monto, 0)
    const totalGastos    = (gastosData || []).reduce((s, g) => s + g.monto, 0)
    const totalHoras     = (horasData || []).reduce((s, h) => s + h.cantidad, 0)
    const ganancia       = totalCobrado - totalGastos
    const valorHora      = totalHoras > 0 ? Math.round(ganancia / totalHoras) : 0
    const obrasActivas   = (obras || []).filter(o => o.status === 'en_ejecucion').length

    const aprobados = (presups || []).filter(p => p.status === 'aprobado').length
    const enviados  = (presups || []).filter(p => ['enviado','aprobado','borrador'].includes(p.status)).length
    const conversionPct = enviados > 0 ? Math.round((aprobados / enviados) * 100) : 0

    setDatos({ totalFacturado, totalCobrado, totalGastos, ganancia, totalHoras, valorHora, obrasActivas, conversionPct, cantPresups: presups?.length || 0 })
    setLoading(false)
  }

  if (!tieneFeature(plan, 'estadisticas')) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 px-8 pb-24" style={{ background: '#0D0D14' }}>
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
        style={{ background: 'rgba(59,130,246,.15)', border: '1px solid rgba(59,130,246,.3)' }}>
        <span className="text-4xl">🔒</span>
      </div>
      <div className="text-center">
        <p className="text-white font-bold text-[18px] mb-2">Estadísticas avanzadas</p>
        <p className="text-gray-400 text-[14px]">Esta función está disponible desde el plan Profesional.</p>
      </div>
      <div className="rounded-2xl p-4 w-full text-center" style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
        <p className="text-gray-500 text-[12px] mb-1">Tu plan actual</p>
        <p className="text-white font-bold text-[16px]">Básico</p>
      </div>
      <button onClick={() => navigate(-1)} className="text-gray-500 text-[13px] underline">Volver</button>
    </div>
  )

  return (
    <div className="flex-1 overflow-y-auto pb-24" style={{ background: '#0D0D14' }}>
      <div className="flex items-center gap-3 px-4 pt-12 pb-4">
        <button onClick={() => navigate(-1)} className="text-gray-400"><ArrowLeft size={22} /></button>
        <h1 className="text-white font-bold text-[20px] flex-1">Estadísticas</h1>
      </div>

      {/* selector período */}
      <div className="flex gap-2 px-4 mb-5">
        {[['semana','Esta semana'],['mes','Este mes'],['anio','Este año']].map(([k,l]) => (
          <button key={k} onClick={() => setPeriodo(k)}
            className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold"
            style={{ background: periodo === k ? '#3B82F6' : '#161622', color: periodo === k ? '#fff' : '#6B7280', border: periodo === k ? 'none' : '1px solid #1E1E2E' }}>
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(59,130,246,.3)', borderTopColor: '#3B82F6' }} />
        </div>
      ) : !datos ? null : (
        <div className="px-4 flex flex-col gap-4">

          {/* la pantalla estrella — ganancia real */}
          <div className="rounded-2xl p-6 text-center" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,.2), rgba(59,130,246,.2))', border: '1px solid rgba(168,85,247,.3)' }}>
            <p className="text-gray-400 text-[12px] mb-1">¿Cuánto ganaste realmente?</p>
            <p className="text-white font-bold text-[38px] leading-none">{fmt(datos.ganancia)}</p>
            <p className="text-gray-400 text-[12px] mt-1">Ganancia neta del período</p>
            <div className="flex justify-center gap-6 mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,.1)' }}>
              <div className="text-center">
                <p className="text-gray-500 text-[10px]">Facturado</p>
                <p className="text-white font-bold text-[16px]">{fmt(datos.totalFacturado)}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-500 text-[10px]">Gastos</p>
                <p className="font-bold text-[16px]" style={{ color: '#EF4444' }}>{fmt(datos.totalGastos)}</p>
              </div>
            </div>
          </div>

          {/* valor hora */}
          <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl" style={{ background: 'rgba(20,184,166,.15)' }}>⏱</div>
            <div>
              <p className="text-gray-500 text-[11px]">Valor hora real</p>
              <p className="font-bold text-[26px]" style={{ color: '#14B8A6' }}>{fmt(datos.valorHora)}</p>
              <p className="text-gray-500 text-[11px]">{datos.totalHoras}h trabajadas</p>
            </div>
          </div>

          {/* métricas grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { l: 'Cobrado',          v: fmt(datos.totalCobrado), c: '#22C55E', icon: '💰' },
              { l: 'Presupuestos',     v: datos.cantPresups,        c: '#3B82F6', icon: '📋' },
              { l: 'Obras activas',    v: datos.obrasActivas,       c: '#F97316', icon: '🏗' },
              { l: 'Conversión',       v: `${datos.conversionPct}%`, c: '#A855F7', icon: '📈' },
            ].map(k => (
              <div key={k.l} className="rounded-2xl p-4" style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{k.icon}</span>
                  <p className="text-gray-500 text-[11px]">{k.l}</p>
                </div>
                <p className="font-bold text-[22px]" style={{ color: k.c }}>{k.v}</p>
              </div>
            ))}
          </div>

          {/* tip si no hay datos */}
          {datos.totalFacturado === 0 && (
            <div className="rounded-2xl p-4 text-center" style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
              <p className="text-gray-400 text-[13px]">Sin datos para el período seleccionado.</p>
              <p className="text-gray-600 text-[11px] mt-1">Creá presupuestos y registrá pagos para ver tus estadísticas.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
