import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/useAuth'
import { usePlan, tieneFeature } from '../../lib/PlanContext'

function fmt(n) { return '$' + Number(n || 0).toLocaleString('es-AR') }
function fmtCorto(n) {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return '$' + (n / 1_000).toFixed(0) + 'k'
  return fmt(n)
}

const PERIODOS = [
  { id: 'este_mes',   label: 'Este mes' },
  { id: 'mes_pasado', label: 'Mes pasado' },
  { id: 'trimestre',  label: 'Últimos 3 meses' },
  { id: 'anio',       label: 'Este año' },
]

function rangoFechas(periodo) {
  const hoy = new Date()
  let desde, hasta
  if (periodo === 'este_mes') {
    desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    hasta = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
  } else if (periodo === 'mes_pasado') {
    desde = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
    hasta = new Date(hoy.getFullYear(), hoy.getMonth(), 0)
  } else if (periodo === 'trimestre') {
    desde = new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1)
    hasta = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
  } else {
    desde = new Date(hoy.getFullYear(), 0, 1)
    hasta = new Date(hoy.getFullYear(), 11, 31)
  }
  return { desde: desde.toISOString().split('T')[0], hasta: hasta.toISOString().split('T')[0] }
}

export default function Reportes() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const plan = usePlan()
  const [periodo, setPeriodo] = useState('este_mes')
  const [datos, setDatos] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !tieneFeature(plan, 'estadisticas')) return
    cargar()
  }, [periodo, user, plan])

  if (!tieneFeature(plan, 'estadisticas')) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-5 px-8 pb-24" style={{ background: '#0D0D14' }}>
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
          style={{ background: 'rgba(59,130,246,.15)', border: '1px solid rgba(59,130,246,.3)' }}>
          <span className="text-4xl">🔒</span>
        </div>
        <div className="text-center">
          <p className="text-white font-bold text-[18px] mb-2">Reportes</p>
          <p className="text-gray-400 text-[14px]">Disponible desde el plan Profesional.</p>
        </div>
        <button onClick={() => navigate(-1)} className="text-gray-500 text-[13px] underline">Volver</button>
      </div>
    )
  }

  async function cargar() {
    setLoading(true)
    const { desde, hasta } = rangoFechas(periodo)

    // Presupuestos del período
    const { data: presups } = await supabase
      .from('presupuestos')
      .select('id, total, status, created_at, fecha_vence, cliente_id, clientes(nombre)')
      .eq('user_id', user.id)
      .gte('created_at', desde)
      .lte('created_at', hasta + 'T23:59:59')

    // Pagos cobrados en el período
    const { data: pagos } = await supabase
      .from('pagos')
      .select('monto, fecha, presupuesto_id, obra_id')
      .eq('user_id', user.id)
      .gte('fecha', desde)
      .lte('fecha', hasta)

    // Gastos del período
    const { data: gastos } = await supabase
      .from('gastos')
      .select('monto, categoria, descripcion, fecha')
      .eq('user_id', user.id)
      .gte('fecha', desde)
      .lte('fecha', hasta)

    // Todas las obras activas (no depende del período — son deudas reales ahora)
    const { data: obras } = await supabase
      .from('obras')
      .select('id, nombre, total, status, cliente_id, clientes(nombre)')
      .eq('user_id', user.id)
      .in('status', ['en_ejecucion', 'pendiente_cobro'])

    const ps  = presups || []
    const pgs = pagos   || []
    const gs  = gastos  || []
    const obs = obras   || []

    // --- Presupuestos ---
    const presupEnviados  = ps.filter(p => ['enviado', 'aprobado'].includes(p.status))
    const presupAprobados = ps.filter(p => p.status === 'aprobado')
    const presupVencidos  = ps.filter(p => p.status === 'vencido' ||
      (p.status === 'enviado' && p.fecha_vence && new Date(p.fecha_vence) < new Date()))
    const tasaCierre = presupEnviados.length > 0
      ? Math.round((presupAprobados.length / presupEnviados.length) * 100)
      : 0
    const totalPresupuestado = presupEnviados.reduce((s, p) => s + p.total, 0)

    // --- Cobrado en el período ---
    const cobradoPeriodo = pgs.reduce((s, p) => s + p.monto, 0)

    // --- Gastos del período ---
    const gastoTotal = gs.reduce((s, g) => s + g.monto, 0)
    const ganancia   = cobradoPeriodo - gastoTotal
    const gastosPorCategoria = gs.reduce((acc, g) => {
      const cat = g.categoria || 'otro'
      acc[cat] = (acc[cat] || 0) + g.monto
      return acc
    }, {})

    // --- Por cobrar (obras activas con saldo pendiente) ---
    let porCobrar = []
    if (obs.length > 0) {
      const { data: todosLosPagosObras } = await supabase
        .from('pagos')
        .select('monto, obra_id')
        .in('obra_id', obs.map(o => o.id))
      const cobradoPorObra = {}
      ;(todosLosPagosObras || []).forEach(p => {
        cobradoPorObra[p.obra_id] = (cobradoPorObra[p.obra_id] || 0) + p.monto
      })
      porCobrar = obs.map(o => ({
        id: o.id,
        nombre: o.nombre,
        cliente: o.clientes?.nombre || '',
        total: o.total,
        cobrado: cobradoPorObra[o.id] || 0,
        pendiente: o.total - (cobradoPorObra[o.id] || 0),
        status: o.status,
        pct: o.total > 0 ? Math.round(((cobradoPorObra[o.id] || 0) / o.total) * 100) : 0,
      })).filter(o => o.pendiente > 0).sort((a, b) => b.pendiente - a.pendiente)
    }

    // --- Top clientes del período (por monto presupuestado) ---
    const porCliente = {}
    ps.forEach(p => {
      if (!p.cliente_id) return
      const nombre = p.clientes?.nombre || 'Sin nombre'
      if (!porCliente[nombre]) porCliente[nombre] = { total: 0, cantidad: 0 }
      porCliente[nombre].total    += p.total
      porCliente[nombre].cantidad += 1
    })
    const topClientes = Object.entries(porCliente)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5)
      .map(([nombre, v]) => ({ nombre, total: v.total, cantidad: v.cantidad }))

    const totalPorCobrar = porCobrar.reduce((s, o) => s + o.pendiente, 0)

    setDatos({
      totalPresupuestado,
      cobradoPeriodo,
      gastoTotal,
      ganancia,
      gastosPorCategoria,
      totalPorCobrar,
      presups: ps,
      presupEnviados,
      presupAprobados,
      presupVencidos,
      tasaCierre,
      porCobrar,
      topClientes,
      obrasActivas: obs.length,
    })
    setLoading(false)
  }

  return (
    <div className="flex-1 overflow-y-auto pb-24" style={{ background: '#0D0D14' }}>

      {/* header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4 sticky top-0 z-10" style={{ background: '#0D0D14' }}>
        <button onClick={() => navigate(-1)} className="text-gray-400"><ArrowLeft size={22} /></button>
        <h1 className="text-white font-bold text-[20px] flex-1">Reportes</h1>
      </div>

      {/* selector período */}
      <div className="flex gap-2 px-4 mb-5 overflow-x-auto pb-1">
        {PERIODOS.map(p => (
          <button key={p.id} onClick={() => setPeriodo(p.id)}
            className="px-4 py-2 rounded-full text-[12px] font-medium shrink-0"
            style={{
              background: periodo === p.id ? '#3B82F6' : '#161622',
              color:      periodo === p.id ? '#fff'    : '#6B7280',
              border:     periodo === p.id ? 'none'    : '1px solid #1E1E2E',
            }}>
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 rounded-full animate-spin"
            style={{ borderColor: 'rgba(59,130,246,.3)', borderTopColor: '#3B82F6' }} />
        </div>
      ) : !datos ? null : (
        <div className="flex flex-col gap-4 px-4">

          {/* ── 1. NÚMEROS CLAVE ── */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl p-4" style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
              <p className="text-[10px] font-semibold mb-1" style={{ color: '#3B82F6' }}>Presupuestado</p>
              <p className="text-white font-bold text-[20px]">{fmtCorto(datos.totalPresupuestado)}</p>
              <p className="text-gray-600 text-[10px] mt-0.5">{datos.presupEnviados.length} enviados/aprobados</p>
            </div>
            <div className="rounded-2xl p-4" style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
              <p className="text-[10px] font-semibold mb-1" style={{ color: '#22C55E' }}>Cobrado</p>
              <p className="text-white font-bold text-[20px]">{fmtCorto(datos.cobradoPeriodo)}</p>
              <p className="text-gray-600 text-[10px] mt-0.5">pagos recibidos</p>
            </div>
            <div className="rounded-2xl p-4" style={{ background: '#161622', border: '1px solid rgba(239,68,68,.2)' }}>
              <p className="text-[10px] font-semibold mb-1" style={{ color: '#EF4444' }}>Gastos</p>
              <p className="text-white font-bold text-[20px]">{fmtCorto(datos.gastoTotal)}</p>
              <p className="text-gray-600 text-[10px] mt-0.5">cargados en obras</p>
            </div>
            <div className="rounded-2xl p-4" style={{ background: datos.ganancia >= 0 ? '#161622' : 'rgba(239,68,68,.06)', border: datos.ganancia >= 0 ? '1px solid #1E1E2E' : '1px solid rgba(239,68,68,.2)' }}>
              <p className="text-[10px] font-semibold mb-1" style={{ color: datos.ganancia >= 0 ? '#A855F7' : '#EF4444' }}>Ganancia neta</p>
              <p className="font-bold text-[20px]" style={{ color: datos.ganancia >= 0 ? '#A855F7' : '#EF4444' }}>{fmtCorto(datos.ganancia)}</p>
              <p className="text-gray-600 text-[10px] mt-0.5">cobrado − gastos</p>
            </div>
          </div>

          {/* por cobrar — siempre visible si hay */}
          {datos.totalPorCobrar > 0 && (
            <div className="rounded-2xl p-4 flex items-center justify-between"
              style={{ background: 'rgba(249,115,22,.08)', border: '1px solid rgba(249,115,22,.25)' }}>
              <div>
                <p className="text-[11px] font-semibold" style={{ color: '#F97316' }}>⏳ Pendiente de cobro</p>
                <p className="text-gray-500 text-[10px] mt-0.5">{datos.porCobrar.length} obra{datos.porCobrar.length > 1 ? 's' : ''} activa{datos.porCobrar.length > 1 ? 's' : ''}</p>
              </div>
              <p className="font-bold text-[22px]" style={{ color: '#F97316' }}>{fmtCorto(datos.totalPorCobrar)}</p>
            </div>
          )}

          {/* gastos por categoría */}
          {datos.gastoTotal > 0 && Object.keys(datos.gastosPorCategoria).length > 0 && (
            <div className="rounded-2xl p-4" style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
              <p className="text-gray-400 text-[11px] font-semibold tracking-wider mb-3">💸 GASTOS POR CATEGORÍA</p>
              <div className="flex flex-col gap-2">
                {Object.entries(datos.gastosPorCategoria)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, monto]) => {
                    const pct = Math.round((monto / datos.gastoTotal) * 100)
                    const LABELS = { material: 'Materiales', mano_obra: 'Mano de obra', herramienta: 'Herramientas', combustible: 'Combustible', otro: 'Otros' }
                    return (
                      <div key={cat}>
                        <div className="flex justify-between mb-1">
                          <p className="text-gray-300 text-[12px]">{LABELS[cat] || cat}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-gray-500 text-[11px]">{pct}%</p>
                            <p className="text-white text-[12px] font-semibold">{fmt(monto)}</p>
                          </div>
                        </div>
                        <div className="h-1 rounded-full" style={{ background: '#1E1E2E' }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#EF4444' }} />
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

          {/* ── 2. PRESUPUESTOS — conversión ── */}
          <div className="rounded-2xl p-4" style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
            <p className="text-gray-400 text-[11px] font-semibold tracking-wider mb-4">📋 PRESUPUESTOS DEL PERÍODO</p>
            <div className="grid grid-cols-4 gap-1 text-center">
              <div>
                <p className="font-bold text-[22px] text-white">{datos.presups.length}</p>
                <p className="text-gray-500 text-[10px]">Creados</p>
              </div>
              <div>
                <p className="font-bold text-[22px]" style={{ color: '#3B82F6' }}>{datos.presupEnviados.length}</p>
                <p className="text-gray-500 text-[10px]">Enviados</p>
              </div>
              <div>
                <p className="font-bold text-[22px]" style={{ color: '#22C55E' }}>{datos.presupAprobados.length}</p>
                <p className="text-gray-500 text-[10px]">Aprobados</p>
              </div>
              <div>
                <p className="font-bold text-[22px]" style={{ color: datos.tasaCierre >= 50 ? '#22C55E' : datos.tasaCierre > 0 ? '#F97316' : '#6B7280' }}>
                  {datos.tasaCierre}%
                </p>
                <p className="text-gray-500 text-[10px]">Cierre</p>
              </div>
            </div>
            {datos.presupVencidos.length > 0 && (
              <div className="mt-3 pt-3 flex items-center gap-2" style={{ borderTop: '1px solid #1E1E2E' }}>
                <span className="text-[11px]" style={{ color: '#EF4444' }}>⚠ {datos.presupVencidos.length} vencido{datos.presupVencidos.length > 1 ? 's' : ''} sin cerrar</span>
                <span className="text-gray-600 text-[10px]">· {fmt(datos.presupVencidos.reduce((s, p) => s + p.total, 0))} perdidos</span>
              </div>
            )}
          </div>

          {/* ── 3. POR COBRAR ── */}
          {datos.porCobrar.length > 0 && (
            <div className="rounded-2xl p-4" style={{ background: '#161622', border: '1px solid rgba(249,115,22,.2)' }}>
              <p className="text-gray-400 text-[11px] font-semibold tracking-wider mb-3">⏳ POR COBRAR</p>
              <div className="flex flex-col gap-3">
                {datos.porCobrar.map((o, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex-1 min-w-0 mr-2">
                        <p className="text-white text-[13px] font-medium truncate">{o.nombre}</p>
                        {o.cliente && <p className="text-gray-500 text-[10px]">{o.cliente}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-[13px]" style={{ color: '#F97316' }}>{fmt(o.pendiente)}</p>
                        <p className="text-gray-600 text-[10px]">de {fmt(o.total)}</p>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: '#0D0D14' }}>
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${o.pct}%`, background: o.pct === 100 ? '#22C55E' : '#3B82F6' }} />
                    </div>
                    <p className="text-gray-600 text-[10px] mt-0.5">{o.pct}% cobrado</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 flex justify-between items-center" style={{ borderTop: '1px solid #1E1E2E' }}>
                <p className="text-gray-500 text-[12px]">Total pendiente</p>
                <p className="font-bold text-[15px]" style={{ color: '#F97316' }}>{fmt(datos.totalPorCobrar)}</p>
              </div>
            </div>
          )}

          {/* ── 4. TOP CLIENTES ── */}
          {datos.topClientes.length > 0 && (
            <div className="rounded-2xl p-4" style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
              <p className="text-gray-400 text-[11px] font-semibold tracking-wider mb-3">👥 TOP CLIENTES DEL PERÍODO</p>
              <div className="flex flex-col gap-3">
                {datos.topClientes.map((c, i) => {
                  const max = datos.topClientes[0].total
                  const pct = Math.round((c.total / max) * 100)
                  return (
                    <div key={i}>
                      <div className="flex justify-between items-baseline mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600 text-[10px] font-bold w-4">{i + 1}</span>
                          <p className="text-white text-[13px]">{c.nombre}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-gray-300 text-[12px] font-semibold">{fmt(c.total)}</p>
                          <p className="text-gray-600 text-[10px]">{c.cantidad} pres.</p>
                        </div>
                      </div>
                      <div className="h-1 rounded-full ml-6" style={{ background: '#1E1E2E' }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#3B82F6' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── 5. SIN DATOS ── */}
          {datos.presups.length === 0 && datos.porCobrar.length === 0 && (
            <div className="flex flex-col items-center py-12 gap-3">
              <span className="text-5xl">📊</span>
              <p className="text-white font-semibold">Sin datos en este período</p>
              <p className="text-gray-500 text-[13px] text-center">Creá presupuestos y registrá pagos para ver tus reportes.</p>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
