import { useNavigate } from 'react-router-dom'
import { Phone, ChevronRight } from 'lucide-react'
import CircleProgress from '../components/ui/CircleProgress'
import { useKpis } from '../lib/useKpis'
import { useAuth } from '../lib/useAuth'

function fmt(n) { return '$' + Number(n || 0).toLocaleString('es-AR') }

function Sparkline({ data, color }) {
  if (!data?.length) return null
  const w = 80, h = 28
  const max = Math.max(...data), min = Math.min(...data)
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / (max - min || 1)) * h
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="mt-1">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const BADGE = {
  pendiente:  { label: 'Pendiente',  bg: 'rgba(249,115,22,.15)', color: '#F97316' },
  confirmada: { label: 'Confirmada', bg: 'rgba(34,197,94,.15)',  color: '#22C55E' },
  cancelada:  { label: 'Cancelada',  bg: 'rgba(239,68,68,.15)',  color: '#EF4444' },
}
const DOT = { pendiente: '#F97316', confirmada: '#22C55E', cancelada: '#EF4444' }

export default function Inicio() {
  const navigate = useNavigate()
  const { perfil, user } = useAuth()
  const { kpis, agenda, embudo, obraDestacada, loading } = useKpis()

  const nombreRaw = perfil?.nombre || user?.user_metadata?.full_name || user?.user_metadata?.name || ''
  const nombre = nombreRaw.split(' ')[0] || 'vos'
  const hoy = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
  const hoyFmt = hoy.charAt(0).toUpperCase() + hoy.slice(1)

  const KPI = [
    { label: 'Facturado (mes)', value: fmt(kpis.facturado), sub: 'Este mes', accent: '#3B82F6', sparkline: [30,45,35,50,42,60] },
    { label: 'Cobrados (mes)',  value: fmt(kpis.cobrado),   sub: 'Cobrado total', accent: '#22C55E', sparkline: [20,30,45,40,55,60] },
    { label: 'Pendiente cobro', value: fmt(kpis.pendiente), sub: `${kpis.obrasActivas} obras activas`, accent: '#F97316', sparkline: null },
    { label: 'Ganancia neta',   value: fmt(kpis.ganancia),  sub: 'Neto real', accent: '#A855F7', sparkline: [10,20,18,30,38,45] },
  ]

  return (
    <div className="flex-1 overflow-y-auto pb-24" style={{ background: '#0D0D14' }}>

      {/* header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-4">
        <div>
          <p className="text-white font-bold text-[18px] leading-tight">Hola, {nombre} 👋</p>
          <p className="text-gray-500 text-[13px]">{hoyFmt}</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 px-4 mb-5">
        {KPI.map(k => (
          <div key={k.label} className="rounded-2xl p-4 flex flex-col"
            style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
            <span className="text-[11px] font-semibold mb-1" style={{ color: k.accent }}>{k.label}</span>
            <span className="text-white font-bold text-[16px] leading-tight">{loading ? '...' : k.value}</span>
            {k.sparkline
              ? <Sparkline data={k.sparkline} color={k.accent} />
              : <div className="mt-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: k.accent + '22' }}>
                  <span style={{ color: k.accent }} className="text-[12px]">$</span>
                </div>
            }
            <span className="text-[11px] mt-1" style={{ color: k.accent + 'CC' }}>{k.sub}</span>
          </div>
        ))}
      </div>

      {/* acciones rápidas */}
      <div className="mx-4 mb-5 rounded-2xl p-4" style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
        <div className="flex justify-between items-start">
          {[
            { icon: '📋', label: 'Nuevo\nPresupuesto', bg: '#1A3A6B', to: '/presupuestos/nuevo' },
            { icon: '👥', label: 'Clientes',            bg: '#1A4D2E', to: '/clientes' },
            { icon: '📅', label: 'Agenda\nde hoy',      bg: '#3D1A7A', to: '/agenda' },
            { icon: '🧾', label: 'Gastos\nrápidos',     bg: '#6B3A1A', to: '/registro?tipo=gasto' },
            { icon: '⏱',  label: 'Registrar\nhoras',    bg: '#1A4A4A', to: '/registro?tipo=horas' },
          ].map(a => (
            <button key={a.label} onClick={() => a.to && navigate(a.to)}
              className="flex flex-col items-center gap-2 flex-1">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                style={{ background: a.bg }}>{a.icon}</div>
              <span className="text-gray-400 text-[9px] text-center leading-tight whitespace-pre-line">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* agenda hoy */}
      <div className="mx-4 mb-5 rounded-2xl p-4" style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-[13px]">📅</span>
            <span className="text-white font-semibold text-[12px] tracking-wider">AGENDA DE HOY</span>
          </div>
          <button onClick={() => navigate('/agenda')} className="text-[12px]" style={{ color: '#3B82F6' }}>Ver todas ›</button>
        </div>

        {agenda.length === 0 ? (
          <p className="text-gray-600 text-[13px] text-center py-3">Sin visitas para hoy</p>
        ) : (
          <div className="relative pl-16">
            <div className="absolute left-12 top-2 bottom-2 w-px" style={{ background: '#2A2A3A' }} />
            <div className="flex flex-col gap-5">
              {agenda.map((v, i) => {
                const badge = BADGE[v.status] || BADGE.pendiente
                return (
                  <div key={i} className="relative flex items-center gap-3">
                    <span className="absolute -left-16 text-gray-500 text-[11px] w-10 text-right">
                      {v.hora ? v.hora.slice(0, 5) : '--'}
                    </span>
                    <div className="absolute -left-[18px] w-2.5 h-2.5 rounded-full border-2"
                      style={{ borderColor: '#0D0D14', background: DOT[v.status] || '#F97316' }} />
                    <div className="flex-1 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-white text-[13px] font-semibold">{v.clientes?.nombre || 'Cliente'}</p>
                        <p className="text-gray-500 text-[11px]">{v.descripcion}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
                          style={{ background: badge.bg, color: badge.color }}>{badge.label}</span>
                        {v.clientes?.telefono && (
                          <a href={`tel:${v.clientes.telefono}`}
                            className="w-7 h-7 rounded-full flex items-center justify-center"
                            style={{ background: '#1E2A3A' }}>
                            <Phone size={13} className="text-blue-400" />
                          </a>
                        )}
                        <ChevronRight size={14} className="text-gray-600" />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* embudo */}
      <div className="mx-4 mb-5 rounded-2xl p-4" style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">▽</span>
            <span className="text-white font-semibold text-[12px] tracking-wider">EMBUDO DE OBRAS</span>
          </div>
          <button onClick={() => navigate('/obras')} className="text-[12px]" style={{ color: '#3B82F6' }}>Ver tablero ›</button>
        </div>
        <div className="flex gap-2">
          {embudo.map(e => (
            <div key={e.label} className="flex-1 rounded-xl p-2.5 flex flex-col items-center gap-1"
              style={{ background: '#0D0D14' }}>
              <span className="text-gray-500 text-[9px] font-medium text-center leading-tight">{e.label}</span>
              <span className="text-white font-bold text-[20px]">{e.count}</span>
              <span className="text-gray-500 text-[9px] text-center">{fmt(e.monto)}</span>
              <div className="w-8 h-1.5 rounded-full mt-1" style={{ background: e.color }} />
            </div>
          ))}
        </div>
      </div>

      {/* obra destacada */}
      {obraDestacada && (
        <div className="mx-4 mb-5 rounded-2xl p-4" style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span style={{ color: '#F97316' }}>⚙</span>
              <span className="font-semibold text-[12px] tracking-wider" style={{ color: '#F97316' }}>OBRA EN EJECUCIÓN</span>
            </div>
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative shrink-0">
              <CircleProgress
                pct={obraDestacada.total > 0 ? Math.round((obraDestacada.cobrado / obraDestacada.total) * 100) : 0}
                size={80} stroke={6} color="#F97316"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-white font-bold text-[16px]">
                  {obraDestacada.total > 0 ? Math.round((obraDestacada.cobrado / obraDestacada.total) * 100) : 0}%
                </span>
                <span className="text-gray-500 text-[9px]">Cobrado</span>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-[15px] leading-tight">{obraDestacada.nombre}</p>
              <div className="flex gap-3 mt-2">
                <div>
                  <p className="text-gray-500 text-[9px]">Total obra</p>
                  <p className="text-white font-bold text-[13px]">{fmt(obraDestacada.total)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-[9px]">Cobrado</p>
                  <p className="font-bold text-[13px]" style={{ color: '#22C55E' }}>{fmt(obraDestacada.cobrado)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-[9px]">Saldo</p>
                  <p className="font-bold text-[13px]" style={{ color: '#F97316' }}>{fmt(obraDestacada.pendiente)}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 pt-3" style={{ borderTop: '1px solid #1E1E2E' }}>
            {[
              { l: 'Ganancia neta',    v: fmt(obraDestacada.ganancia_neta), c: '#22C55E' },
              { l: 'Gastos',           v: fmt(obraDestacada.gastos),        c: '#F97316' },
              { l: 'Horas trabajadas', v: `${obraDestacada.horas || 0}h`,   c: '#3B82F6' },
              { l: 'Valor hora',       v: fmt(obraDestacada.valor_hora),    c: '#A855F7' },
            ].map(m => (
              <div key={m.l} className="text-center">
                <p className="font-bold text-[12px]" style={{ color: m.c }}>{m.v}</p>
                <p className="text-gray-500 text-[9px] leading-tight">{m.l}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
