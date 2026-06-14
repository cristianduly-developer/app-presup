import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, Plus, RefreshCw } from 'lucide-react'
import CircleProgress from '../../components/ui/CircleProgress'
import { usePresupuestos } from '../../lib/usePresupuestos'

const FILTROS = ['Todos', 'Borrador', 'Enviado', 'Aprobado', 'Vencido']

const STATUS_STYLE = {
  enviado:  { label: 'Enviado',  bg: 'rgba(59,130,246,.15)', color: '#3B82F6' },
  aprobado: { label: 'Aprobado', bg: 'rgba(34,197,94,.15)',  color: '#22C55E' },
  borrador: { label: 'Borrador', bg: 'rgba(107,114,128,.2)', color: '#9CA3AF' },
  vencido:  { label: 'Vencido',  bg: 'rgba(239,68,68,.15)',  color: '#EF4444' },
}
const STATUS_COLOR = { enviado: '#3B82F6', aprobado: '#22C55E', borrador: '#6B7280', vencido: '#EF4444' }

function fmt(n) { return '$' + Number(n || 0).toLocaleString('es-AR') }

export default function Presupuestos() {
  const [filtro, setFiltro] = useState('Todos')
  const navigate = useNavigate()
  const { presupuestos, loading, cargar } = usePresupuestos()

  const lista = filtro === 'Todos'
    ? presupuestos
    : presupuestos.filter(p => p.status === filtro.toLowerCase())

  return (
    <div className="flex-1 overflow-y-auto pb-24" style={{ background: '#0D0D14' }}>
      <div className="flex items-center justify-between px-5 pt-12 pb-4">
        <h1 className="text-white font-bold text-[20px]">Presupuestos</h1>
        <div className="flex gap-3 items-center">
          <button onClick={cargar}><RefreshCw size={18} className="text-gray-400" /></button>
          <button><Search size={20} className="text-gray-400" /></button>
          <button className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: '#3B82F6' }}
            onClick={() => navigate('/presupuestos/nuevo')}>
            <Plus size={18} className="text-white" />
          </button>
        </div>
      </div>

      <div className="flex gap-2 px-4 mb-5 overflow-x-auto pb-1">
        {FILTROS.map(f => (
          <button key={f} onClick={() => setFiltro(f)}
            className="px-4 py-1.5 rounded-full text-[12px] font-medium shrink-0"
            style={{
              background: filtro === f ? '#3B82F6' : '#161622',
              color: filtro === f ? '#fff' : '#6B7280',
              border: filtro === f ? 'none' : '1px solid #1E1E2E',
            }}>
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        </div>
      ) : lista.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-3">
          <span className="text-5xl">📋</span>
          <p className="text-white font-semibold">Sin presupuestos</p>
          <p className="text-gray-500 text-sm text-center px-8">Tocá el + para crear tu primer presupuesto</p>
          <button onClick={() => navigate('/presupuestos/nuevo')}
            className="mt-2 px-6 py-3 rounded-2xl text-white font-semibold text-sm"
            style={{ background: '#3B82F6' }}>
            Crear presupuesto
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 px-4">
          {lista.map(p => {
            const st = STATUS_STYLE[p.status] || STATUS_STYLE.borrador
            const color = STATUS_COLOR[p.status] || '#6B7280'
            const cobrado = (p.pagos || []).reduce((s, pg) => s + pg.monto, 0)
            const pct = p.total > 0 ? Math.round((cobrado / p.total) * 100) : 0
            const fecha = new Date(p.created_at).toLocaleDateString('es-AR')
            return (
              <button key={p.id} onClick={() => navigate(`/presupuestos/${p.id}`)}
                className="text-left w-full rounded-2xl p-4 active:opacity-70"
                style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <CircleProgress pct={pct} size={54} color={color} stroke={4} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white text-[10px] font-bold">{pct}%</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-white font-semibold text-[14px] truncate">
                        {p.clientes?.nombre || 'Sin cliente'}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                        style={{ background: st.bg, color: st.color }}>{st.label}</span>
                    </div>
                    <p className="text-white font-bold text-[18px] leading-tight">{fmt(p.total)}</p>
                    <p className="text-gray-500 text-[11px] mt-0.5">Pres. #{p.numero} · {fecha}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: '1px solid #1E1E2E' }}>
                  <Accion label="WhatsApp" bg="rgba(34,197,94,.12)"   color="#22C55E" />
                  <Accion label="Duplicar"  bg="rgba(59,130,246,.12)" color="#3B82F6" />
                  <Accion label="Editar"    bg="rgba(107,114,128,.12)" color="#9CA3AF" />
                  <Accion label="Ver"       bg="rgba(168,85,247,.12)" color="#A855F7"
                    onClick={() => navigate(`/presupuestos/${p.id}`)} />
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Accion({ label, bg, color, onClick }) {
  return (
    <button className="flex-1 py-2 rounded-xl text-[11px] font-semibold"
      style={{ background: bg, color }}
      onClick={e => { e.stopPropagation(); onClick?.() }}>
      {label}
    </button>
  )
}
