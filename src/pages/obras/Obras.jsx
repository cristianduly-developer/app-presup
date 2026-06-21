import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, Plus, RefreshCw } from 'lucide-react'
import CircleProgress from '../../components/ui/CircleProgress'
import { useObras } from '../../lib/useObras'

const FILTROS = ['Todas', 'En ejecución', 'Pend. cobro', 'Finalizadas', 'Cobradas']

const STATUS_MAP = {
  en_ejecucion:    { label: 'En ejecución',      bg: 'rgba(34,197,94,.15)',   color: '#22C55E', filtro: 'En ejecución' },
  pendiente_cobro: { label: 'Pendiente de cobro', bg: 'rgba(249,115,22,.15)', color: '#F97316', filtro: 'Pend. cobro' },
  cobrada:         { label: 'Cobrada',            bg: 'rgba(59,130,246,.15)', color: '#3B82F6', filtro: 'Cobradas' },
  presupuestada:   { label: 'Presupuestada',      bg: 'rgba(107,114,128,.2)', color: '#9CA3AF', filtro: 'Todas' },
  finalizada:      { label: 'Finalizada',         bg: 'rgba(20,184,166,.15)', color: '#14B8A6', filtro: 'Finalizadas' },
  enviado:         { label: 'Enviado',            bg: 'rgba(59,130,246,.15)', color: '#3B82F6', filtro: 'Todas' },
}
const STATUS_COLOR = { en_ejecucion: '#22C55E', pendiente_cobro: '#F97316', cobrada: '#3B82F6', presupuestada: '#6B7280', finalizada: '#14B8A6' }

import { fmt } from '../../lib/fmt'

export default function Obras() {
  const [filtro, setFiltro] = useState('Todas')
  const [vista, setVista] = useState('lista')
  const navigate = useNavigate()
  const { obras, loading, cargar } = useObras()

  const lista = filtro === 'Todas' ? obras
    : obras.filter(o => STATUS_MAP[o.status]?.filtro === filtro)

  const totalTotal    = obras.reduce((s, o) => s + (o.total || 0), 0)
  const totalCobrado  = obras.reduce((s, o) => s + (o.cobrado || 0), 0)
  const totalPendiente= obras.reduce((s, o) => s + (o.pendiente || 0), 0)
  const totalGanancia = obras.reduce((s, o) => s + (o.ganancia_neta || 0), 0)
  const pctCobrado    = totalTotal > 0 ? Math.round((totalCobrado / totalTotal) * 100) : 0

  return (
    <div className="flex-1 overflow-y-auto pb-24" style={{ background: '#0D0D14' }}>
      <div className="flex items-center justify-between px-5 pt-12 pb-4">
        <h1 className="text-white font-bold text-[20px]">Obras</h1>
        <div className="flex gap-3 items-center">
          <button onClick={cargar}><RefreshCw size={18} className="text-gray-400" /></button>
          <button><Search size={20} className="text-gray-400" /></button>
          <button className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#3B82F6' }}>
            <Plus size={18} className="text-white" />
          </button>
        </div>
      </div>

      <div className="flex gap-2 px-4 mb-4 overflow-x-auto pb-1">
        {FILTROS.map(f => (
          <button key={f} onClick={() => setFiltro(f)}
            className="px-4 py-1.5 rounded-full text-[11px] font-medium shrink-0"
            style={{ background: filtro === f ? '#3B82F6' : '#161622', color: filtro === f ? '#fff' : '#6B7280', border: filtro === f ? 'none' : '1px solid #1E1E2E' }}>
            {f}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 px-4 mb-4">
        {[
          { label: 'Total presupuestado', value: fmt(totalTotal),    sub: `${obras.length} obras`,       color: '#3B82F6' },
          { label: 'Cobrado',            value: fmt(totalCobrado),   sub: `${pctCobrado}%`,              color: '#22C55E' },
          { label: 'Pendiente de cobro', value: fmt(totalPendiente), sub: `${100-pctCobrado}%`,          color: '#F97316' },
          { label: 'Ganancia neta',      value: fmt(totalGanancia),  sub: totalTotal > 0 ? `${Math.round((totalGanancia/totalTotal)*100)}% margen` : '-', color: '#A855F7' },
        ].map(k => (
          <div key={k.label} className="rounded-2xl p-3" style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
            <p className="text-[10px] font-medium mb-1" style={{ color: k.color }}>{k.label}</p>
            <p className="text-white font-bold text-[15px]">{loading ? '...' : k.value}</p>
            <p className="text-gray-500 text-[10px] mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* selector vista */}
      <div className="flex gap-2 px-4 mb-4">
        {[['lista', '≡ Lista'], ['tablero', '⊞ Tablero'], ['embudo', '▽ Embudo']].map(([k, l]) => (
          <button key={k} onClick={() => setVista(k)}
            className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold"
            style={{ background: vista === k ? '#3B82F6' : '#161622', color: vista === k ? '#fff' : '#6B7280', border: vista === k ? 'none' : '1px solid #1E1E2E' }}>
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(59,130,246,.3)', borderTopColor: '#3B82F6' }} />
        </div>
      ) : lista.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-3">
          <span className="text-5xl">🏗</span>
          <p className="text-white font-semibold">Sin obras</p>
          <p className="text-gray-500 text-sm text-center px-8">Las obras se crean al aprobar un presupuesto</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 px-4">
          {lista.map(o => {
            const st = STATUS_MAP[o.status] || STATUS_MAP.presupuestada
            const color = STATUS_COLOR[o.status] || '#6B7280'
            const pct = o.total > 0 ? Math.round(((o.cobrado || 0) / o.total) * 100) : 0
            return (
              <button key={o.id} onClick={() => navigate(`/obras/${o.id}`)}
                className="text-left w-full rounded-2xl p-4 active:opacity-70"
                style={{ background: '#161622', border: '1px solid #1E1E2E', borderLeft: `4px solid ${color}` }}>
                <div className="flex items-start gap-3 mb-3">
                  <div className="relative shrink-0">
                    <CircleProgress pct={pct} size={58} stroke={4} color={color} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white font-bold text-[11px]">{pct}%</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <p className="text-white font-semibold text-[13px] leading-tight flex-1">{o.nombre}</p>
                      <span className="text-[9px] font-semibold px-2 py-1 rounded-full shrink-0" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                    </div>
                    {o.fecha_inicio && <p className="text-gray-600 text-[10px]">📅 {new Date(o.fecha_inicio).toLocaleDateString('es-AR')}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-1 py-3" style={{ borderTop: '1px solid #1E1E2E', borderBottom: '1px solid #1E1E2E' }}>
                  <StatCol label="Total"    value={fmt(o.total)}         color="#fff" />
                  <StatCol label="Cobrado"  value={fmt(o.cobrado)}       color="#22C55E" />
                  <StatCol label="Pendiente" value={fmt(o.pendiente)}    color="#F97316" />
                  <StatCol label="Ganancia" value={fmt(o.ganancia_neta)} color="#A855F7" />
                  <StatCol label="Horas"    value={`${o.horas || 0}h`}  color="#3B82F6" />
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StatCol({ label, value, color }) {
  return (
    <div className="text-center">
      <p className="font-semibold text-[11px] truncate" style={{ color }}>{value}</p>
      <p className="text-gray-600 text-[9px]">{label}</p>
    </div>
  )
}
