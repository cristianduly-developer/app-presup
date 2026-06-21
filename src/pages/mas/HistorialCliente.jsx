import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'

import { fmt, fmtFecha, waMe } from '../../lib/fmt'

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
  excelente: { emoji: '🟢', label: 'Excelente', color: '#22C55E' },
  normal:    { emoji: '🟡', label: 'Normal',    color: '#9CA3AF' },
  riesgoso:  { emoji: '🔴', label: 'Riesgoso', color: '#EF4444' },
}

export default function HistorialCliente() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [cliente, setCliente] = useState(null)
  const [presups, setPresups] = useState([])
  const [obras, setObras] = useState([])
  const [tab, setTab] = useState('presupuestos')
  const [loading, setLoading] = useState(true)
  const [showEditar, setShowEditar] = useState(false)
  const [formEdit, setFormEdit] = useState({ nombre: '', telefono: '', email: '', direccion: '', clasificacion: 'normal' })
  const [guardandoEdit, setGuardandoEdit] = useState(false)

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

  function abrirEditar() {
    setFormEdit({
      nombre: cliente.nombre || '',
      telefono: cliente.telefono || '',
      email: cliente.email || '',
      direccion: cliente.direccion || cliente.ciudad || '',
      clasificacion: cliente.clasificacion || 'normal',
    })
    setShowEditar(true)
  }

  async function guardarEditar() {
    if (!formEdit.nombre.trim()) return
    setGuardandoEdit(true)
    const { error } = await supabase.from('clientes').update({
      nombre: formEdit.nombre.trim(),
      telefono: formEdit.telefono.trim(),
      email: formEdit.email.trim(),
      direccion: formEdit.direccion.trim(),
      clasificacion: formEdit.clasificacion,
    }).eq('id', id)
    setGuardandoEdit(false)
    if (!error) {
      setShowEditar(false)
      cargar()
    }
  }

  const set = (k, v) => setFormEdit(f => ({ ...f, [k]: v }))

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
        <button onClick={abrirEditar}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
          <Pencil size={16} className="text-gray-400" />
        </button>
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
            {cliente.email && <p className="text-gray-500 text-[11px]">✉ {cliente.email}</p>}
            {(cliente.direccion || cliente.ciudad) && <p className="text-gray-500 text-[11px]">📍 {cliente.direccion || cliente.ciudad}</p>}
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
            <a href={waMe(cliente.telefono)} target="_blank" rel="noreferrer"
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

      {/* modal editar cliente */}
      {showEditar && (
        <div className="fixed inset-0 z-[60] flex items-end" onClick={() => setShowEditar(false)}>
          <div className="w-full max-w-[430px] mx-auto rounded-t-3xl p-6 overflow-y-auto max-h-[85vh]"
            style={{ background: '#161622' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <p className="text-white font-bold text-[17px]">Editar cliente</p>
              <button onClick={() => setShowEditar(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="flex flex-col gap-3">
              {[['nombre','Nombre *','text'],['telefono','Teléfono / WhatsApp','tel'],['email','Email','email'],['direccion','Dirección','text']].map(([k,l,t]) => (
                <div key={k}>
                  <label className="text-gray-500 text-[11px] block mb-1">{l}</label>
                  <input type={t} value={formEdit[k]} onChange={e => set(k, e.target.value)} placeholder={l.replace(' *','')}
                    className="w-full rounded-xl px-4 py-3 text-white text-[14px] outline-none"
                    style={{ background: '#0D0D14', border: '1px solid #2A2A3A' }} />
                </div>
              ))}
              <div>
                <label className="text-gray-500 text-[11px] block mb-2">Clasificación</label>
                <div className="flex gap-2">
                  {Object.entries(CLAS).map(([k, v]) => (
                    <button key={k} onClick={() => set('clasificacion', k)}
                      className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold flex items-center justify-center gap-1"
                      style={{
                        background: formEdit.clasificacion === k ? v.color + '22' : '#0D0D14',
                        color: formEdit.clasificacion === k ? v.color : '#6B7280',
                        border: `1px solid ${formEdit.clasificacion === k ? v.color + '44' : '#2A2A3A'}`,
                      }}>
                      {v.emoji} {v.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={guardarEditar} disabled={guardandoEdit || !formEdit.nombre.trim()}
              className="w-full py-4 rounded-2xl text-white font-bold text-[15px] mt-5 disabled:opacity-50"
              style={{ background: '#3B82F6' }}>
              {guardandoEdit ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      )}
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
