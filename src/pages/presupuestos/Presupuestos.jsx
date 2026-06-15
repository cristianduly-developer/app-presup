import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, RefreshCw, X } from 'lucide-react'
import CircleProgress from '../../components/ui/CircleProgress'
import { usePresupuestos } from '../../lib/usePresupuestos'

const FILTROS = ['Pendientes', 'Todos', 'Borrador', 'Enviado', 'Aprobado', 'Rechazado', 'Vencido']

const STATUS_STYLE = {
  enviado:   { label: 'Enviado',   bg: 'rgba(59,130,246,.15)',  color: '#3B82F6' },
  aprobado:  { label: 'Aprobado',  bg: 'rgba(34,197,94,.15)',   color: '#22C55E' },
  borrador:  { label: 'Borrador',  bg: 'rgba(107,114,128,.2)',  color: '#9CA3AF' },
  vencido:   { label: 'Vencido',   bg: 'rgba(239,68,68,.15)',   color: '#EF4444' },
  rechazado: { label: 'Rechazado', bg: 'rgba(239,68,68,.15)',   color: '#EF4444' },
}
const STATUS_COLOR = { enviado: '#3B82F6', aprobado: '#22C55E', borrador: '#6B7280', vencido: '#EF4444', rechazado: '#EF4444' }

function fmt(n) { return '$' + Number(n || 0).toLocaleString('es-AR') }

function waMe(tel) {
  const d = tel.replace(/\D/g, '')
  if (d.startsWith('54')) return `https://wa.me/${d}`
  if (d.startsWith('0')) return `https://wa.me/54${d.slice(1)}`
  return `https://wa.me/54${d}`
}

export default function Presupuestos() {
  const [filtro, setFiltro] = useState('Pendientes')
  const [busqueda, setBusqueda] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const navigate = useNavigate()
  const { presupuestos, loading, cargar, crear } = usePresupuestos()

  const hoy = new Date(); hoy.setHours(0,0,0,0)
  function diasParaVencer(p) {
    if (!p.fecha_vence) return Infinity
    return Math.ceil((new Date(p.fecha_vence + 'T00:00:00') - hoy) / 86400000)
  }

  const STATUS_ORDEN = { enviado: 0, borrador: 1, aprobado: 2, rechazado: 3, vencido: 4 }
  const lista = presupuestos
    .filter(p => {
      if (filtro === 'Todos') return true
      if (filtro === 'Pendientes') return ['enviado', 'borrador'].includes(p.status)
      return p.status === filtro.toLowerCase()
    })
    .sort((a, b) => {
      const da = STATUS_ORDEN[a.status] ?? 5
      const db = STATUS_ORDEN[b.status] ?? 5
      if (da !== db) return da - db
      // enviados: por vencimiento ASC (más próximo primero)
      if (a.status === 'enviado' && b.status === 'enviado') {
        const va = a.fecha_vence ? new Date(a.fecha_vence).getTime() : Infinity
        const vb = b.fecha_vence ? new Date(b.fecha_vence).getTime() : Infinity
        return va - vb
      }
      return new Date(b.created_at) - new Date(a.created_at)
    })
    .filter(p => {
      if (!busqueda.trim()) return true
      const q = busqueda.toLowerCase()
      return (
        p.titulo?.toLowerCase().includes(q) ||
        p.clientes?.nombre?.toLowerCase().includes(q) ||
        String(p.numero).includes(q)
      )
    })

  async function duplicar(e, p) {
    e.stopPropagation()
    const items = (p.presupuesto_items || []).map(it => ({
      tipo: it.tipo, descripcion: it.descripcion, unidad: it.unidad,
      cantidad: it.cantidad, precio_unit: it.precio_unit,
    }))
    const { data } = await crear(
      { titulo: p.titulo ? `Copia de ${p.titulo}` : '', cliente_id: p.cliente_id, vigencia_dias: p.vigencia_dias || 5, notas_internas: p.notas_internas || '', status: 'borrador' },
      items
    )
    if (data?.id) navigate(`/presupuestos/${data.id}`)
  }

  return (
    <div className="flex-1 overflow-y-auto pb-24" style={{ background: '#0D0D14' }}>
      <div className="flex items-center justify-between px-5 pt-12 pb-4">
        <h1 className="text-white font-bold text-[20px]">Presupuestos</h1>
        <div className="flex gap-3 items-center">
          <button onClick={cargar}><RefreshCw size={18} className="text-gray-400" /></button>
          <button onClick={() => { setShowSearch(s => !s); setBusqueda('') }}>
            <Search size={20} className={showSearch ? 'text-blue-400' : 'text-gray-400'} />
          </button>
          <button className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: '#3B82F6' }}
            onClick={() => navigate('/presupuestos/nuevo')}>
            <Plus size={18} className="text-white" />
          </button>
        </div>
      </div>

      {showSearch && (
        <div className="mx-4 mb-3 flex items-center gap-2 rounded-2xl px-4 py-3"
          style={{ background: '#161622', border: '1px solid #3B82F6' }}>
          <Search size={15} className="text-blue-400 shrink-0" />
          <input
            autoFocus
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por trabajo, cliente o número..."
            className="flex-1 bg-transparent text-white text-[14px] outline-none placeholder-gray-600"
          />
          {busqueda && <button onClick={() => setBusqueda('')}><X size={15} className="text-gray-500" /></button>}
        </div>
      )}

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
            const dias = p.status === 'enviado' ? diasParaVencer(p) : Infinity
            const urgente = dias <= 3 && dias >= 0
            const vencido = dias < 0
            const urgColor = vencido ? '#EF4444' : '#F97316'
            const cardBorder = urgente || vencido ? `1px solid ${urgColor}44` : '1px solid #1E1E2E'
            const cardBg = urgente || vencido ? `rgba(${vencido ? '239,68,68' : '249,115,22'},.04)` : '#161622'
            return (
              <button key={p.id} onClick={() => navigate(`/presupuestos/${p.id}`)}
                className="text-left w-full rounded-2xl p-4 active:opacity-70"
                style={{ background: cardBg, border: cardBorder }}>
                {/* banner urgencia */}
                {(urgente || vencido) && (
                  <div className="flex items-center gap-1.5 mb-2.5 px-2 py-1 rounded-lg"
                    style={{ background: urgColor + '18' }}>
                    <span className="text-[11px]">{vencido ? '🔴' : '🟠'}</span>
                    <span className="text-[11px] font-semibold" style={{ color: urgColor }}>
                      {vencido
                        ? `Vencido hace ${Math.abs(dias)} día${Math.abs(dias) !== 1 ? 's' : ''}`
                        : dias === 0 ? '¡Vence HOY!'
                        : `Vence en ${dias} día${dias !== 1 ? 's' : ''}`}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <CircleProgress pct={pct} size={54} color={urgente || vencido ? urgColor : color} stroke={4} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white text-[10px] font-bold">{pct}%</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-white font-semibold text-[14px] truncate">
                        {p.titulo || p.clientes?.nombre || 'Sin descripción'}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                        style={{ background: st.bg, color: st.color }}>{st.label}</span>
                    </div>
                    <p className="text-white font-bold text-[18px] leading-tight">{fmt(p.total)}</p>
                    <p className="text-gray-500 text-[11px] mt-0.5">
                      {p.titulo && p.clientes?.nombre ? `${p.clientes.nombre} · ` : ''}Pres. #{p.numero} · {fecha}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: '1px solid #1E1E2E' }}>
                  {p.clientes?.telefono && (
                    <Accion label="WhatsApp" bg="rgba(34,197,94,.12)" color="#22C55E"
                      href={waMe(p.clientes.telefono)} />
                  )}
                  <Accion label="Duplicar"  bg="rgba(59,130,246,.12)" color="#3B82F6"
                    onClick={e => duplicar(e, p)} />
                  <Accion label="Editar"    bg="rgba(107,114,128,.12)" color="#9CA3AF"
                    onClick={e => { e.stopPropagation(); navigate(`/presupuestos/nuevo?editar=${p.id}`) }} />
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

function Accion({ label, bg, color, onClick, href }) {
  if (href) return (
    <a href={href} target="_blank" rel="noreferrer"
      className="flex-1 py-2 rounded-xl text-[11px] font-semibold text-center"
      style={{ background: bg, color }}
      onClick={e => e.stopPropagation()}>
      {label}
    </a>
  )
  return (
    <button className="flex-1 py-2 rounded-xl text-[11px] font-semibold"
      style={{ background: bg, color }}
      onClick={e => { e.stopPropagation(); onClick?.() }}>
      {label}
    </button>
  )
}
