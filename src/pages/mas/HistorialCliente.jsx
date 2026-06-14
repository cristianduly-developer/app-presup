import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'

function fmt(n) { return '$' + Number(n || 0).toLocaleString('es-AR') }
function fmtFecha(s) { return s ? new Date(s).toLocaleDateString('es-AR') : '' }

const PRES_STATUS = {
  borrador:  { label: 'Borrador',   color: '#6B7280' },
  enviado:   { label: 'Enviado',    color: '#3B82F6' },
  aprobado:  { label: 'Aprobado',   color: '#22C55E' },
  rechazado: { label: 'Rechazado',  color: '#EF4444' },
  vencido:   { label: 'Vencido',    color: '#F97316' },
}
const OBRA_STATUS = {
  en_ejecucion:    { label: 'En ejecución',       color: '#22C55E' },
  pendiente_cobro: { label: 'Pendiente de cobro', color: '#F97316' },
  finalizada:      { label: 'Finalizada',         color: '#14B8A6' },
  cobrada:         { label: 'Cobrada',            color: '#3B82F6' },
}
const CLAS = {
  excelente: { emoji: '🟢', label: 'Excelente' },
  normal:    { emoji: '🟡', label: 'Normal' },
  riesgoso:  { emoji: '🔴', label: 'Riesgoso' },
}

export default function HistorialCliente() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [cliente, setCliente] = useState(null)
  const [presups, setPresups] = useState([])
  const [obras, setObras] = useState([])
  const [tab, setTab] = useState('presupuestos')
  const [loading, setLoading] = useState(true)

  useEffect(() => { cargar() }, [id])

  async function cargar() {
    setLoading(true)
    const [{ data: c }, { data: p }, { data: o }] = await Promise.all([
      supabase.from('clientes').select('*').eq('id', id).single(),
      supabase.from('presupuestos').select('*').eq('cliente_id', id).order('created_at', { ascending: false }),
      supabase.from('obras').select('*').eq('cliente_id', id).order('created_at', { ascending: false }),
    ])
    setCliente(c)
    setPresups(p || [])
    setObras(o || [])
    setLoading(false)
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center" style={{ background: '#0D0D14' }}>
      <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(59,130,246,.3)', borderTopColor: '#3B82F6' }} />
    </div>
  )

  if (!cliente) return null

  const cls = CLAS[cliente.clasificacion] || CLAS.normal
  const totalPresups = presups.reduce((s, p) => s + (p.total || 0), 0)
  const totalObras   = obras.reduce((s, o) => s + (o.total || 0), 0)

  return (
    <div className="flex-1 overflow-y-auto pb-24" style={{ background: '#0D0D14' }}>
      <div className="flex items-center gap-3 px-4 pt-12 pb-4">
        <button onClick={() => navigate(-1)} className="text-gray-400"><ArrowLeft size={22} /></button>
        <h1 className="text-white font-bold text-[20px] flex-1">Historial</h1>
      </div>

      {/* card cliente */}
      <div className="mx-4 mb-5 rounded-2xl p-5" style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl shrink-0"
            style={{ background: '#3B82F6' }}>
            {cliente.nombre.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-white font-bold text-[17px]">{cliente.nombre}</p>
              <span className="text-[13px]">{cls.emoji}</span>
            </div>
            {cliente.telefono && <p className="text-gray-500 text-[12px]">☎ {cliente.telefono}</p>}
            {cliente.ciudad && <p className="text-gray-500 text-[11px]">📍 {cliente.ciudad}</p>}
          </div>
        </div>
        {/* resumen financiero */}
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4" style={{ borderTop: '1px solid #1E1E2E' }}>
          <div className="text-center">
            <p className="text-gray-500 text-[10px]">Presupuestos</p>
            <p className="text-white font-bold text-[15px]">{presups.length}</p>
          </div>
          <div className="text-center">
            <p className="text-gray-500 text-[10px]">Obras</p>
            <p className="text-white font-bold text-[15px]">{obras.length}</p>
          </div>
          <div className="text-center">
            <p className="text-gray-500 text-[10px]">Facturado</p>
            <p className="font-bold text-[15px]" style={{ color: '#22C55E' }}>{fmt(totalPresups + totalObras)}</p>
          </div>
        </div>
        {/* acciones */}
        {cliente.telefono && (
          <div className="flex gap-2 mt-4">
            <a href={`tel:${cliente.telefono}`}
              className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold text-center"
              style={{ background: 'rgba(59,130,246,.12)', color: '#3B82F6' }}>
              Llamar
            </a>
            <a href={`https://wa.me/${cliente.telefono.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
              className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold text-center"
              style={{ background: 'rgba(34,197,94,.12)', color: '#22C55E' }}>
              WhatsApp
            </a>
          </div>
        )}
      </div>

      {/* tabs */}
      <div className="flex gap-2 px-4 mb-4">
        {[['presupuestos','Presupuestos'],['obras','Obras']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)}
            className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold"
            style={{ background: tab === k ? '#3B82F6' : '#161622', color: tab === k ? '#fff' : '#6B7280', border: tab === k ? 'none' : '1px solid #1E1E2E' }}>
            {l} {tab === k ? '' : `(${k === 'presupuestos' ? presups.length : obras.length})`}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 px-4">
        {tab === 'presupuestos' && (
          presups.length === 0 ? <Empty texto="Sin presupuestos" /> :
          presups.map(p => {
            const st = PRES_STATUS[p.status] || PRES_STATUS.borrador
            return (
              <button key={p.id} onClick={() => navigate(`/presupuestos/${p.id}`)}
                className="text-left rounded-2xl p-4 active:opacity-70"
                style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-white font-semibold text-[14px]">{p.titulo || `Presupuesto #${p.numero || ''}`}</p>
                    <p className="text-gray-500 text-[11px] mt-0.5">{fmtFecha(p.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold text-[15px]">{fmt(p.total)}</p>
                    <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: st.color + '22', color: st.color }}>{st.label}</span>
                  </div>
                </div>
              </button>
            )
          })
        )}
        {tab === 'obras' && (
          obras.length === 0 ? <Empty texto="Sin obras" /> :
          obras.map(o => {
            const st = OBRA_STATUS[o.status] || OBRA_STATUS.en_ejecucion
            return (
              <button key={o.id} onClick={() => navigate(`/obras/${o.id}`)}
                className="text-left rounded-2xl p-4 active:opacity-70"
                style={{ background: '#161622', border: '1px solid #1E1E2E', borderLeft: `4px solid ${st.color}` }}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-white font-semibold text-[14px]">{o.nombre}</p>
                    <p className="text-gray-500 text-[11px] mt-0.5">{fmtFecha(o.fecha_inicio)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold text-[15px]">{fmt(o.total)}</p>
                    <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: st.color + '22', color: st.color }}>{st.label}</span>
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

function Empty({ texto }) {
  return (
    <div className="py-12 text-center">
      <p className="text-gray-500 text-[13px]">{texto}</p>
    </div>
  )
}
