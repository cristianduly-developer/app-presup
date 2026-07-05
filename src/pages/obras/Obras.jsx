import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, RefreshCw, X } from 'lucide-react'
import CircleProgress from '../../components/ui/CircleProgress'
import { useObras, invalidarCacheObras } from '../../lib/useObras'
import { supabase } from '../../lib/supabase'
import { fmt } from '../../lib/fmt'

const FILTROS = ['Todas', 'En ejecución', 'Pend. cobro', 'Finalizadas', 'Cobradas']

const STATUS_MAP = {
  en_ejecucion:    { label: 'En ejecución',      bg: 'rgba(34,197,94,.15)',   color: '#22C55E', filtro: 'En ejecución' },
  pendiente_cobro: { label: 'Pendiente de cobro', bg: 'rgba(249,115,22,.15)', color: '#F97316', filtro: 'Pend. cobro' },
  cobrada:         { label: 'Cobrada',            bg: 'rgba(59,130,246,.15)', color: '#3B82F6', filtro: 'Cobradas' },
  presupuestada:   { label: 'Presupuestada',      bg: 'rgba(107,114,128,.2)', color: '#9CA3AF', filtro: 'Todas' },
  finalizada:      { label: 'Finalizada',         bg: 'rgba(20,184,166,.15)', color: '#14B8A6', filtro: 'Finalizadas' },
}

const PALETA = ['#EF4444','#F97316','#EAB308','#22C55E','#14B8A6','#3B82F6','#8B5CF6','#EC4899','#6B7280']

const KANBAN_COLS = [
  { key: 'en_ejecucion',    label: 'En ejecución',  color: '#22C55E' },
  { key: 'pendiente_cobro', label: 'Pend. cobro',   color: '#F97316' },
  { key: 'finalizada',      label: 'Finalizada',    color: '#14B8A6' },
  { key: 'cobrada',         label: 'Cobrada',       color: '#3B82F6' },
]

export default function Obras() {
  const [filtro, setFiltro]   = useState('Todas')
  const [vista, setVista]     = useState('lista')
  const [busqueda, setBusqueda] = useState(false)
  const [query, setQuery]     = useState('')
  const [colorPicker, setColorPicker] = useState(null) // obra id
  const [coloresLocal, setColoresLocal] = useState({}) // override optimista
  const navigate = useNavigate()
  const { obras: obrasDB, loading, cargar } = useObras()

  // mezcla colores locales (optimistas) con los de la DB
  const obras = obrasDB.map(o => coloresLocal[o.id] !== undefined ? { ...o, color: coloresLocal[o.id] } : o)

  async function guardarColor(obraId, color) {
    setColorPicker(null)
    setColoresLocal(prev => ({ ...prev, [obraId]: color }))
    await supabase.from('obras').update({ color }).eq('id', obraId)
    invalidarCacheObras()
  }

  const porFiltro = filtro === 'Todas' ? obras
    : obras.filter(o => STATUS_MAP[o.status]?.filtro === filtro)

  const lista = query.trim()
    ? porFiltro.filter(o => o.nombre.toLowerCase().includes(query.toLowerCase()))
    : porFiltro

  const totalTotal    = obras.reduce((s, o) => s + (o.total || 0), 0)
  const totalCobrado  = obras.reduce((s, o) => s + (o.cobrado || 0), 0)
  const totalPendiente= obras.reduce((s, o) => s + (o.pendiente || 0), 0)
  const totalGanancia = obras.reduce((s, o) => s + (o.ganancia_neta || 0), 0)
  const pctCobrado    = totalTotal > 0 ? Math.round((totalCobrado / totalTotal) * 100) : 0

  return (
    <div className="flex-1 overflow-y-auto pb-24" style={{ background: '#0D0D14' }}>

      {/* header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-3">
        <h1 className="text-white font-bold text-[20px]">Obras</h1>
        <div className="flex gap-3 items-center">
          <button onClick={cargar}><RefreshCw size={18} className="text-gray-400" /></button>
          <button onClick={() => setBusqueda(b => !b)}>
            <Search size={20} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* buscador */}
      {busqueda && (
        <div className="mx-4 mb-3 flex items-center gap-2 rounded-2xl px-4 py-3"
          style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
          <Search size={14} className="text-gray-500" />
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Buscar obra..." autoFocus
            className="flex-1 bg-transparent text-white text-[14px] outline-none placeholder-gray-600" />
          {query && <button onClick={() => setQuery('')}><X size={14} className="text-gray-500" /></button>}
        </div>
      )}

      {/* filtros */}
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
        {[['lista','≡ Lista'],['tablero','⊞ Tablero'],['compacto','· Compacto']].map(([k, l]) => (
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
      ) : vista === 'lista' ? (
        <VistaLista lista={lista} navigate={navigate} setColorPicker={setColorPicker} />
      ) : vista === 'tablero' ? (
        <VistaTablero obras={obras} navigate={navigate} setColorPicker={setColorPicker} />
      ) : (
        <VistaCompacta lista={lista} navigate={navigate} setColorPicker={setColorPicker} />
      )}

      {/* color picker overlay */}
      {colorPicker && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-6"
          style={{ background: 'rgba(0,0,0,.6)' }}
          onClick={() => setColorPicker(null)}>
          <div className="rounded-2xl p-5" style={{ background: '#161622', border: '1px solid #1E1E2E' }}
            onClick={e => e.stopPropagation()}>
            <p className="text-white font-semibold text-[14px] mb-4 text-center">Color de la obra</p>
            <div className="flex gap-3 flex-wrap justify-center">
              {PALETA.map(c => (
                <button key={c} onClick={() => guardarColor(colorPicker, c)}
                  className="w-9 h-9 rounded-full border-2"
                  style={{ background: c, borderColor: 'rgba(255,255,255,.15)' }} />
              ))}
              <button onClick={() => guardarColor(colorPicker, null)}
                className="w-9 h-9 rounded-full border-2 flex items-center justify-center"
                style={{ background: '#0D0D14', borderColor: '#2A2A3A' }}>
                <X size={14} className="text-gray-500" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ColorDot({ obra, setColorPicker }) {
  const c = obra.color || '#2A2A3A'
  return (
    <button
      onClick={e => { e.stopPropagation(); setColorPicker(obra.id) }}
      className="w-4 h-4 rounded-full shrink-0 border"
      style={{ background: obra.color || 'transparent', borderColor: obra.color || '#3A3A4A' }}
      title="Cambiar color"
    />
  )
}

function VistaLista({ lista, navigate, setColorPicker }) {
  return (
    <div className="flex flex-col gap-3 px-4">
      {lista.map(o => {
        const st    = STATUS_MAP[o.status] || STATUS_MAP.presupuestada
        const acent = o.color || st.color
        const pct   = o.total > 0 ? Math.round(((o.cobrado || 0) / o.total) * 100) : 0
        const titulo = o.presupuesto_titulo || o.nombre
        const cliente = o.cliente_nombre
        return (
          <button key={o.id} onClick={() => navigate(`/obras/${o.id}`)}
            className="text-left w-full rounded-2xl p-4 active:opacity-70"
            style={{
              background: o.color ? `${o.color}20` : '#161622',
              border: `1px solid ${o.color ? o.color + '55' : '#1E1E2E'}`,
              borderLeft: `4px solid ${acent}`,
            }}>
            <div className="flex items-start gap-3 mb-3">
              <div className="relative shrink-0">
                <CircleProgress pct={pct} size={54} stroke={4} color={acent} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white font-bold text-[10px]">{pct}%</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <div className="flex-1 min-w-0">
                    {cliente && <p className="text-gray-400 text-[11px] truncate">{cliente}</p>}
                    <p className="text-white font-semibold text-[14px] leading-tight truncate">{titulo}</p>
                    {o.presupuesto_numero && <p className="text-gray-600 text-[10px]">Pres. #{o.presupuesto_numero}</p>}
                  </div>
                  <ColorDot obra={o} setColorPicker={setColorPicker} />
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                  {o.fecha_inicio && <span className="text-gray-600 text-[10px]">{new Date(o.fecha_inicio).toLocaleDateString('es-AR')}</span>}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-1 pt-3" style={{ borderTop: '1px solid #1E1E2E' }}>
              <StatCol label="Total"     value={fmt(o.total)}         color="#fff" />
              <StatCol label="Cobrado"   value={fmt(o.cobrado)}       color="#22C55E" />
              <StatCol label="Pendiente" value={fmt(o.pendiente)}     color="#F97316" />
              <StatCol label="Ganancia"  value={fmt(o.ganancia_neta)} color="#A855F7" />
            </div>
          </button>
        )
      })}
    </div>
  )
}

function VistaTablero({ obras, navigate, setColorPicker }) {
  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-3 px-4" style={{ minWidth: `${KANBAN_COLS.length * 220}px` }}>
        {KANBAN_COLS.map(col => {
          const items = obras.filter(o => o.status === col.key)
          const total = items.reduce((s, o) => s + (o.total || 0), 0)
          return (
            <div key={col.key} className="rounded-2xl p-3 flex flex-col gap-2" style={{ width: 210, minWidth: 210, background: '#161622', border: '1px solid #1E1E2E' }}>
              {/* columna header */}
              <div className="flex items-center justify-between mb-1 pb-2" style={{ borderBottom: `2px solid ${col.color}` }}>
                <span className="text-[11px] font-bold" style={{ color: col.color }}>{col.label}</span>
                <span className="text-[10px] font-bold text-gray-500">{items.length}</span>
              </div>
              {total > 0 && <p className="text-[10px] text-gray-600 -mt-1 mb-1">{fmt(total)}</p>}
              {items.length === 0 && (
                <p className="text-gray-700 text-[11px] text-center py-4">Sin obras</p>
              )}
              {items.map(o => {
                const acent  = o.color || col.color
                const pct    = o.total > 0 ? Math.round(((o.cobrado || 0) / o.total) * 100) : 0
                const titulo = o.presupuesto_titulo || o.nombre
                return (
                  <button key={o.id} onClick={() => navigate(`/obras/${o.id}`)}
                    className="w-full text-left rounded-xl p-3 active:opacity-70"
                    style={{
                      background: o.color ? `${o.color}20` : '#0D0D14',
                      border: `1px solid ${o.color ? o.color + '55' : '#1E1E2E'}`,
                      borderLeft: `3px solid ${acent}`,
                    }}>
                    <div className="flex items-start gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        {o.cliente_nombre && <p className="text-gray-500 text-[10px] truncate">{o.cliente_nombre}</p>}
                        <p className="text-white text-[12px] font-semibold leading-tight truncate">{titulo}</p>
                      </div>
                      <ColorDot obra={o} setColorPicker={setColorPicker} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold" style={{ color: acent }}>{fmt(o.total)}</span>
                      <span className="text-gray-600 text-[10px]">{pct}% cob.</span>
                    </div>
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function VistaCompacta({ lista, navigate, setColorPicker }) {
  return (
    <div className="flex flex-col gap-1.5 px-4">
      {lista.map(o => {
        const st     = STATUS_MAP[o.status] || STATUS_MAP.presupuestada
        const acent  = o.color || st.color
        const pct    = o.total > 0 ? Math.round(((o.cobrado || 0) / o.total) * 100) : 0
        const titulo = o.presupuesto_titulo || o.nombre
        return (
          <button key={o.id} onClick={() => navigate(`/obras/${o.id}`)}
            className="w-full text-left flex items-center gap-3 rounded-2xl px-4 py-3 active:opacity-70"
            style={{
              background: o.color ? `${o.color}20` : '#161622',
              border: `1px solid ${o.color ? o.color + '55' : '#1E1E2E'}`,
              borderLeft: `3px solid ${acent}`,
            }}>
            <ColorDot obra={o} setColorPicker={setColorPicker} />
            <div className="flex-1 min-w-0">
              <p className="text-white text-[13px] font-semibold truncate">{titulo}</p>
              {o.cliente_nombre && <p className="text-gray-500 text-[10px] truncate">{o.cliente_nombre}</p>}
            </div>
            <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ background: st.bg, color: st.color }}>{st.label}</span>
            <div className="text-right shrink-0">
              <p className="text-white text-[12px] font-bold">{fmt(o.total)}</p>
              <p className="text-gray-600 text-[9px]">{pct}% cob.</p>
            </div>
          </button>
        )
      })}
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
