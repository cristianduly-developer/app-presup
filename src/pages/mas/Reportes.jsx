import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/useAuth'
import { usePlan, tieneFeature } from '../../lib/PlanContext'

function fmt(n) { return '$' + Number(n || 0).toLocaleString('es-AR') }
function fmtCorto(n) {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return '$' + (n / 1_000).toFixed(0) + 'k'
  return fmt(n)
}
function fmtFecha(d) { return d ? new Date(d).toLocaleDateString('es-AR') : '' }

const PERIODOS = [
  { id: 'esta_semana', label: 'Esta semana' },
  { id: 'este_mes',   label: 'Este mes' },
  { id: 'mes_pasado', label: 'Mes pasado' },
  { id: 'trimestre',  label: 'Trimestre' },
  { id: 'anio',       label: 'Este año' },
]

const STATUS_LABEL = { borrador: 'Borrador', enviado: 'Enviado', aprobado: 'Aprobado', rechazado: 'Rechazado', vencido: 'Vencido' }
const STATUS_COLOR = { borrador: '#6B7280', enviado: '#3B82F6', aprobado: '#22C55E', rechazado: '#EF4444', vencido: '#F97316' }

function rangoFechas(periodo) {
  const hoy = new Date()
  let desde, hasta
  if (periodo === 'esta_semana') {
    const dia = hoy.getDay() === 0 ? 6 : hoy.getDay() - 1
    desde = new Date(hoy); desde.setDate(hoy.getDate() - dia); desde.setHours(0,0,0,0)
    hasta = new Date(desde); hasta.setDate(desde.getDate() + 6); hasta.setHours(23,59,59,999)
  } else if (periodo === 'este_mes') {
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

// Agrupa pagos por semana o mes para el gráfico
function agruparPagos(pagos, periodo) {
  if (periodo === 'esta_semana') {
    const DIAS = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
    const grupos = DIAS.map(l => ({ label: l, monto: 0 }))
    pagos.forEach(p => {
      const d = new Date(p.fecha + 'T00:00:00')
      let idx = d.getDay() === 0 ? 6 : d.getDay() - 1
      if (idx >= 0 && idx < 7) grupos[idx].monto += p.monto
    })
    return grupos
  }
  if (periodo === 'este_mes' || periodo === 'mes_pasado') {
    const grupos = [{ label: 'Sem 1', monto: 0 }, { label: 'Sem 2', monto: 0 }, { label: 'Sem 3', monto: 0 }, { label: 'Sem 4', monto: 0 }]
    pagos.forEach(p => {
      const dia = new Date(p.fecha + 'T00:00:00').getDate()
      const sem = Math.min(Math.floor((dia - 1) / 7), 3)
      grupos[sem].monto += p.monto
    })
    return grupos
  }
  // trimestre o año: agrupar por mes
  const meses = {}
  pagos.forEach(p => {
    const d = new Date(p.fecha + 'T00:00:00')
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}`
    const label = d.toLocaleString('es-AR', { month: 'short' })
    if (!meses[key]) meses[key] = { label, monto: 0 }
    meses[key].monto += p.monto
  })
  return Object.values(meses)
}

function BarChart({ datos }) {
  const max = Math.max(...datos.map(d => d.monto), 1)
  return (
    <div className="flex items-end gap-1.5 h-24">
      {datos.map((d, i) => {
        const pct = (d.monto / max) * 100
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full rounded-t-lg relative flex items-end justify-center"
              style={{ height: 72, background: '#1E1E2E' }}>
              <div className="w-full rounded-t-lg transition-all"
                style={{ height: `${Math.max(pct, 2)}%`, background: d.monto > 0 ? '#22C55E' : '#2A2A3A' }} />
              {d.monto > 0 && (
                <span className="absolute -top-5 text-[8px] font-bold text-green-400 whitespace-nowrap">
                  {fmtCorto(d.monto)}
                </span>
              )}
            </div>
            <span className="text-[9px] text-gray-600">{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function Reportes() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const plan = usePlan()
  const [periodo, setPeriodo] = useState('este_mes')
  const [datos, setDatos] = useState(null)
  const [loading, setLoading] = useState(true)
  const reportRef = useRef(null)

  useEffect(() => {
    if (!user || !tieneFeature(plan, 'estadisticas')) return
    cargar()
  }, [periodo, user, plan])

  if (!tieneFeature(plan, 'estadisticas')) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-5 px-8 pb-24" style={{ background: '#0D0D14' }}>
        <span className="text-4xl">🔒</span>
        <p className="text-white font-bold text-[18px]">Reportes — Plan Profesional</p>
        <p className="text-gray-400 text-[14px] text-center">Disponible desde el plan Profesional.</p>
        <button onClick={() => navigate(-1)} className="text-gray-500 text-[13px] underline">Volver</button>
      </div>
    )
  }

  async function cargar() {
    setLoading(true)
    const { desde, hasta } = rangoFechas(periodo)

    const [{ data: presups }, { data: pagos }, { data: gastos }, { data: obras }] = await Promise.all([
      supabase.from('presupuestos')
        .select('id, numero, titulo, total, status, created_at, fecha_vence, clientes(nombre)')
        .eq('user_id', user.id)
        .gte('created_at', desde)
        .lte('created_at', hasta + 'T23:59:59')
        .order('created_at', { ascending: false }),
      supabase.from('pagos')
        .select('monto, fecha, presupuesto_id, obra_id')
        .eq('user_id', user.id)
        .gte('fecha', desde)
        .lte('fecha', hasta),
      supabase.from('gastos')
        .select('monto, categoria, descripcion, fecha')
        .eq('user_id', user.id)
        .gte('fecha', desde)
        .lte('fecha', hasta),
      supabase.from('obras')
        .select('id, nombre, total, status, clientes(nombre)')
        .eq('user_id', user.id)
        .in('status', ['en_ejecucion', 'pendiente_cobro']),
    ])

    const ps  = presups || []
    const pgs = pagos   || []
    const gs  = gastos  || []
    const obs = obras   || []

    // Items del período para servicios frecuentes
    let itemsFrecuentes = []
    if (ps.length > 0) {
      const { data: items } = await supabase
        .from('presupuesto_items')
        .select('descripcion, tipo, cantidad')
        .in('presupuesto_id', ps.map(p => p.id))
      const conteo = {}
      ;(items || []).forEach(it => {
        const key = it.descripcion.trim().toLowerCase()
        if (!conteo[key]) conteo[key] = { descripcion: it.descripcion, tipo: it.tipo, veces: 0, cantTotal: 0 }
        conteo[key].veces++
        conteo[key].cantTotal += it.cantidad || 1
      })
      itemsFrecuentes = Object.values(conteo).sort((a, b) => b.veces - a.veces).slice(0, 8)
    }

    // Obras con cobro pendiente
    let porCobrar = []
    if (obs.length > 0) {
      const { data: pagosObras } = await supabase
        .from('pagos').select('monto, obra_id').in('obra_id', obs.map(o => o.id))
      const cobPorObra = {}
      ;(pagosObras || []).forEach(p => { cobPorObra[p.obra_id] = (cobPorObra[p.obra_id] || 0) + p.monto })
      porCobrar = obs.map(o => ({
        id: o.id, nombre: o.nombre, cliente: o.clientes?.nombre || '',
        total: o.total, cobrado: cobPorObra[o.id] || 0,
        pendiente: o.total - (cobPorObra[o.id] || 0),
        pct: o.total > 0 ? Math.round(((cobPorObra[o.id] || 0) / o.total) * 100) : 0,
        status: o.status,
      })).sort((a, b) => b.pendiente - a.pendiente)
    }

    // Stats presupuestos
    const presupEnviados  = ps.filter(p => ['enviado','aprobado'].includes(p.status))
    const presupAprobados = ps.filter(p => p.status === 'aprobado')
    const tasaCierre = presupEnviados.length > 0
      ? Math.round((presupAprobados.length / presupEnviados.length) * 100) : 0

    const cobradoPeriodo  = pgs.reduce((s, p) => s + p.monto, 0)
    const gastoTotal      = gs.reduce((s, g) => s + g.monto, 0)
    const totalPresupuestado = presupAprobados.reduce((s, p) => s + p.total, 0)
    const ganancia        = cobradoPeriodo - gastoTotal
    const totalPorCobrar  = porCobrar.reduce((s, o) => s + o.pendiente, 0)

    // Gráfico
    const grafico = agruparPagos(pgs, periodo)

    // Top clientes
    const porCliente = {}
    ps.forEach(p => {
      const nombre = p.clientes?.nombre || 'Sin cliente'
      if (!porCliente[nombre]) porCliente[nombre] = { total: 0, cantidad: 0 }
      porCliente[nombre].total    += p.total
      porCliente[nombre].cantidad += 1
    })
    const topClientes = Object.entries(porCliente)
      .sort((a, b) => b[1].total - a[1].total).slice(0, 5)
      .map(([nombre, v]) => ({ nombre, ...v }))

    setDatos({ ps, pgs, totalPresupuestado, cobradoPeriodo, gastoTotal, ganancia,
      totalPorCobrar, presupEnviados, presupAprobados, tasaCierre,
      porCobrar, topClientes, grafico, itemsFrecuentes })
    setLoading(false)
  }

  function imprimir() { window.print() }

  const LABEL_PERIODO = PERIODOS.find(p => p.id === periodo)?.label || ''

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; color: #111 !important; }
          .print-page { background: #fff !important; color: #111 !important; padding: 0 !important; }
          .print-card {
            background: #fff !important;
            border: 1px solid #e5e5e5 !important;
            border-radius: 8px !important;
            color: #111 !important;
            break-inside: avoid;
          }
          .print-label { color: #555 !important; }
          .print-value { color: #111 !important; }
          .bar-fill { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
      `}</style>

      <div className="flex-1 overflow-y-auto pb-24 print-page" style={{ background: '#0D0D14' }} ref={reportRef}>

        {/* HEADER */}
        <div className="flex items-center gap-3 px-4 pt-12 pb-4 sticky top-0 z-10 no-print" style={{ background: '#0D0D14' }}>
          <button onClick={() => navigate(-1)} className="text-gray-400"><ArrowLeft size={22} /></button>
          <h1 className="text-white font-bold text-[20px] flex-1">Reportes</h1>
          <button onClick={imprimir}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold"
            style={{ background: '#1E1E2E', color: '#A855F7', border: '1px solid rgba(168,85,247,.3)' }}>
            <Printer size={14} /> PDF
          </button>
        </div>

        {/* título para impresión */}
        <div className="hidden px-4 pb-4" style={{ display: 'none' }}>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Reporte — {LABEL_PERIODO}</h1>
          <p style={{ fontSize: 12, color: '#888' }}>Generado el {fmtFecha(new Date().toISOString())}</p>
        </div>

        {/* SELECTOR PERÍODO */}
        <div className="flex gap-2 px-4 mb-5 overflow-x-auto pb-1 no-print">
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

            {/* ── KPIs ── */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Aprobado', value: fmtCorto(datos.totalPresupuestado), sub: `${datos.presupAprobados.length} presup. aprobados`, color: '#3B82F6' },
                { label: 'Cobrado', value: fmtCorto(datos.cobradoPeriodo), sub: 'pagos recibidos', color: '#22C55E' },
                { label: 'Gastos', value: fmtCorto(datos.gastoTotal), sub: 'registrados en obras', color: '#EF4444' },
                { label: 'Ganancia neta', value: fmtCorto(datos.ganancia), sub: 'cobrado − gastos',
                  color: datos.ganancia >= 0 ? '#A855F7' : '#EF4444' },
              ].map(k => (
                <div key={k.label} className="rounded-2xl p-4 print-card"
                  style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
                  <p className="text-[10px] font-semibold mb-1 print-label" style={{ color: k.color }}>{k.label}</p>
                  <p className="font-bold text-[20px] print-value" style={{ color: k.color }}>{k.value}</p>
                  <p className="text-gray-600 text-[10px] mt-0.5 print-label">{k.sub}</p>
                </div>
              ))}
            </div>

            {/* pendiente de cobro banner */}
            {datos.totalPorCobrar > 0 && (
              <div className="rounded-2xl px-4 py-3 flex items-center justify-between print-card"
                style={{ background: 'rgba(249,115,22,.08)', border: '1px solid rgba(249,115,22,.25)' }}>
                <div>
                  <p className="text-[11px] font-semibold" style={{ color: '#F97316' }}>⏳ Pendiente de cobro</p>
                  <p className="text-gray-500 text-[10px]">{datos.porCobrar.length} obra{datos.porCobrar.length > 1 ? 's' : ''} activa{datos.porCobrar.length > 1 ? 's' : ''}</p>
                </div>
                <p className="font-bold text-[22px]" style={{ color: '#F97316' }}>{fmtCorto(datos.totalPorCobrar)}</p>
              </div>
            )}

            {/* ── GRÁFICO COBRADO ── */}
            <div className="rounded-2xl p-4 print-card" style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
              <p className="text-gray-400 text-[11px] font-semibold tracking-wider mb-4 print-label">
                💰 COBRADO — {LABEL_PERIODO.toUpperCase()}
              </p>
              {datos.grafico.every(g => g.monto === 0) ? (
                <p className="text-gray-600 text-[12px] text-center py-4">Sin pagos en este período</p>
              ) : (
                <BarChart datos={datos.grafico} />
              )}
            </div>

            {/* ── PRESUPUESTOS DEL PERÍODO ── */}
            <div className="rounded-2xl p-4 print-card" style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-gray-400 text-[11px] font-semibold tracking-wider print-label">
                  📋 PRESUPUESTOS ({datos.ps.length})
                </p>
                <div className="flex gap-3 text-[10px]">
                  <span style={{ color: '#22C55E' }}>{datos.presupAprobados.length} aprobados</span>
                  <span className="text-gray-600">·</span>
                  <span style={{ color: '#3B82F6' }}>{datos.tasaCierre}% cierre</span>
                </div>
              </div>

              {datos.ps.length === 0 ? (
                <p className="text-gray-600 text-[12px] text-center py-3">Sin presupuestos en este período</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {datos.ps.map(p => (
                    <div key={p.id} className="flex items-center gap-3 py-2"
                      style={{ borderBottom: '1px solid #1E1E2E' }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-[12px] font-medium truncate print-value">
                          #{p.numero} {p.titulo || p.clientes?.nombre || '—'}
                        </p>
                        <p className="text-gray-500 text-[10px]">{fmtFecha(p.created_at)}{p.clientes?.nombre && !p.titulo ? '' : p.clientes?.nombre ? ` · ${p.clientes.nombre}` : ''}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-white text-[12px] font-semibold print-value">{fmt(p.total)}</p>
                        <p className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                          style={{ background: (STATUS_COLOR[p.status] || '#6B7280') + '22', color: STATUS_COLOR[p.status] || '#6B7280' }}>
                          {STATUS_LABEL[p.status] || p.status}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2">
                    <p className="text-gray-500 text-[11px]">Total aprobados</p>
                    <p className="text-white font-bold text-[13px]">{fmt(datos.totalPresupuestado)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* ── OBRAS ACTIVAS ── */}
            {datos.porCobrar.length > 0 && (
              <div className="rounded-2xl p-4 print-card" style={{ background: '#161622', border: '1px solid rgba(249,115,22,.2)' }}>
                <p className="text-gray-400 text-[11px] font-semibold tracking-wider mb-3 print-label">
                  🏗 OBRAS ACTIVAS ({datos.porCobrar.length})
                </p>
                <div className="flex flex-col gap-3">
                  {datos.porCobrar.map((o, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex-1 min-w-0 mr-2">
                          <p className="text-white text-[12px] font-medium truncate print-value">{o.nombre}</p>
                          {o.cliente && <p className="text-gray-500 text-[10px]">{o.cliente}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-[13px]" style={{ color: '#F97316' }}>{fmt(o.pendiente)}</p>
                          <p className="text-gray-600 text-[10px]">pend. de {fmt(o.total)}</p>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: '#0D0D14' }}>
                        <div className="h-full rounded-full bar-fill"
                          style={{ width: `${o.pct}%`, background: '#3B82F6' }} />
                      </div>
                      <p className="text-gray-600 text-[10px] mt-0.5">{o.pct}% cobrado</p>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2" style={{ borderTop: '1px solid #1E1E2E' }}>
                    <p className="text-gray-500 text-[11px]">Total pendiente</p>
                    <p className="font-bold text-[14px]" style={{ color: '#F97316' }}>{fmt(datos.totalPorCobrar)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── SERVICIOS MÁS FRECUENTES ── */}
            {datos.itemsFrecuentes.length > 0 && (
              <div className="rounded-2xl p-4 print-card" style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
                <p className="text-gray-400 text-[11px] font-semibold tracking-wider mb-3 print-label">
                  🔧 SERVICIOS MÁS FRECUENTES
                </p>
                <div className="flex flex-col gap-2.5">
                  {datos.itemsFrecuentes.map((it, i) => {
                    const max = datos.itemsFrecuentes[0].veces
                    const pct = Math.round((it.veces / max) * 100)
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-gray-600 text-[10px] font-bold w-4 shrink-0">{i+1}</span>
                            <p className="text-white text-[12px] truncate print-value">{it.descripcion}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span className="text-[9px] px-1.5 py-0.5 rounded"
                              style={{ background: it.tipo === 'material' ? 'rgba(59,130,246,.15)' : 'rgba(249,115,22,.15)',
                                       color: it.tipo === 'material' ? '#3B82F6' : '#F97316' }}>
                              {it.tipo === 'material' ? 'Mat.' : 'M.O.'}
                            </span>
                            <p className="text-gray-400 text-[11px] font-semibold">{it.veces}x</p>
                          </div>
                        </div>
                        <div className="h-1 rounded-full ml-6" style={{ background: '#1E1E2E' }}>
                          <div className="h-full rounded-full bar-fill"
                            style={{ width: `${pct}%`, background: it.tipo === 'material' ? '#3B82F6' : '#F97316' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── TOP CLIENTES ── */}
            {datos.topClientes.length > 0 && (
              <div className="rounded-2xl p-4 print-card" style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
                <p className="text-gray-400 text-[11px] font-semibold tracking-wider mb-3 print-label">👥 TOP CLIENTES</p>
                <div className="flex flex-col gap-2.5">
                  {datos.topClientes.map((c, i) => {
                    const max = datos.topClientes[0].total
                    const pct = Math.round((c.total / max) * 100)
                    return (
                      <div key={i}>
                        <div className="flex justify-between items-baseline mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600 text-[10px] font-bold w-4">{i+1}</span>
                            <p className="text-white text-[13px] print-value">{c.nombre}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-gray-300 text-[12px] font-semibold print-value">{fmt(c.total)}</p>
                            <p className="text-gray-600 text-[10px]">{c.cantidad} pres.</p>
                          </div>
                        </div>
                        <div className="h-1 rounded-full ml-6" style={{ background: '#1E1E2E' }}>
                          <div className="h-full rounded-full bar-fill" style={{ width: `${pct}%`, background: '#3B82F6' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* sin datos */}
            {datos.ps.length === 0 && datos.porCobrar.length === 0 && (
              <div className="flex flex-col items-center py-12 gap-3">
                <span className="text-5xl">📊</span>
                <p className="text-white font-semibold">Sin datos en este período</p>
                <p className="text-gray-500 text-[13px] text-center">Creá presupuestos y registrá pagos para ver tus reportes.</p>
              </div>
            )}

            {/* botón exportar abajo — alternativo al header */}
            <button onClick={imprimir}
              className="w-full py-4 rounded-2xl font-bold text-[14px] flex items-center justify-center gap-2 no-print"
              style={{ background: 'rgba(168,85,247,.1)', border: '1px solid rgba(168,85,247,.3)', color: '#A855F7' }}>
              <Printer size={16} /> Exportar reporte a PDF
            </button>

          </div>
        )}
      </div>
    </>
  )
}
