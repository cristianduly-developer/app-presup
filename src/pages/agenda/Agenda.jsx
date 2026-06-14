import { useState, useEffect } from 'react'
import { Phone, MessageCircle, MapPin, Plus, X, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/useAuth'
import { useClientes } from '../../lib/useClientes'

const STATUS_COLOR = {
  pendiente:  { dot: '#FBBF24', bg: 'rgba(251,191,36,.15)',  text: '#FBBF24', label: 'Pendiente'  },
  confirmada: { dot: '#22C55E', bg: 'rgba(34,197,94,.15)',   text: '#22C55E', label: 'Confirmada' },
  realizada:  { dot: '#3B82F6', bg: 'rgba(59,130,246,.15)',  text: '#3B82F6', label: 'Realizada'  },
  cancelada:  { dot: '#EF4444', bg: 'rgba(239,68,68,.15)',   text: '#EF4444', label: 'Cancelada'  },
}

function addDays(date, n) {
  const d = new Date(date); d.setDate(d.getDate() + n); return d
}
function toISO(date) { return date.toISOString().split('T')[0] }
function fmtDia(date) {
  return date.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' })
}

export default function Agenda() {
  const { user } = useAuth()
  const { clientes } = useClientes()
  const [hoy] = useState(new Date())
  const [semanaOffset, setSemanaOffset] = useState(0)
  const [diaIdx, setDiaIdx] = useState(0)
  const [visitas, setVisitas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNueva, setShowNueva] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState({ cliente_id: '', descripcion: '', direccion: '', hora: '09:00', notas: '' })

  const lunes = addDays(hoy, semanaOffset * 7 - ((hoy.getDay() + 6) % 7))
  const dias = Array.from({ length: 7 }, (_, i) => addDays(lunes, i))
  const diaSeleccionado = dias[diaIdx]
  const fechaStr = toISO(diaSeleccionado)

  useEffect(() => {
    // al cambiar semana, seleccioná el primer día de esa semana (o hoy si es la semana actual)
    if (semanaOffset === 0) {
      const idx = dias.findIndex(d => toISO(d) === toISO(hoy))
      setDiaIdx(idx >= 0 ? idx : 0)
    } else {
      setDiaIdx(0)
    }
  }, [semanaOffset])

  useEffect(() => { cargar() }, [fechaStr])

  async function cargar() {
    setLoading(true)
    const { data } = await supabase
      .from('visitas')
      .select('*, clientes(nombre, telefono)')
      .eq('fecha', fechaStr)
      .order('hora')
    setVisitas(data || [])
    setLoading(false)
  }

  async function guardar() {
    if (!form.descripcion.trim()) return
    setGuardando(true)
    await supabase.from('visitas').insert({
      user_id:     user.id,
      cliente_id:  form.cliente_id || null,
      descripcion: form.descripcion,
      direccion:   form.direccion,
      hora:        form.hora,
      notas:       form.notas,
      fecha:       fechaStr,
      status:      'pendiente',
    })
    setShowNueva(false)
    setForm({ cliente_id: '', descripcion: '', direccion: '', hora: '09:00', notas: '' })
    setGuardando(false)
    cargar()
  }

  async function cambiarStatus(id, status) {
    await supabase.from('visitas').update({ status }).eq('id', id)
    setVisitas(vs => vs.map(v => v.id === id ? { ...v, status } : v))
  }

  async function eliminar(id) {
    await supabase.from('visitas').delete().eq('id', id)
    setVisitas(vs => vs.filter(v => v.id !== id))
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="flex-1 overflow-y-auto pb-24" style={{ background: '#0D0D14' }}>
      {/* header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-3">
        <h1 className="text-white font-bold text-[20px]">Agenda</h1>
        <button onClick={() => setShowNueva(true)}
          className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#3B82F6' }}>
          <Plus size={18} className="text-white" />
        </button>
      </div>

      {/* navegación semana */}
      <div className="flex items-center gap-2 px-4 mb-2">
        <button onClick={() => setSemanaOffset(o => o - 1)} className="text-gray-500 p-1"><ChevronLeft size={18} /></button>
        <p className="flex-1 text-center text-gray-400 text-[12px]">
          {fmtDia(dias[0])} — {fmtDia(dias[6])}
        </p>
        <button onClick={() => setSemanaOffset(o => o + 1)} className="text-gray-500 p-1"><ChevronRight size={18} /></button>
      </div>

      {/* selector de días */}
      <div className="flex gap-2 px-4 mb-5 overflow-x-auto pb-1">
        {dias.map((d, i) => {
          const esHoy = toISO(d) === toISO(hoy)
          const activo = i === diaIdx
          return (
            <button key={i} onClick={() => setDiaIdx(i)}
              className="flex flex-col items-center px-3 py-2 rounded-2xl min-w-[48px]"
              style={{ background: activo ? '#3B82F6' : '#161622', border: esHoy && !activo ? '1px solid #3B82F6' : '1px solid transparent' }}>
              <span className="text-[10px]" style={{ color: activo ? '#BFDBFE' : '#6B7280' }}>
                {d.toLocaleDateString('es-AR', { weekday: 'short' }).toUpperCase().slice(0,3)}
              </span>
              <span className="text-[17px] font-bold" style={{ color: activo ? '#fff' : esHoy ? '#3B82F6' : '#9CA3AF' }}>
                {d.getDate()}
              </span>
            </button>
          )
        })}
      </div>

      {/* lista visitas */}
      <div className="px-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(59,130,246,.3)', borderTopColor: '#3B82F6' }} />
          </div>
        ) : visitas.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <span className="text-5xl">📅</span>
            <p className="text-white font-semibold">Sin visitas este día</p>
            <button onClick={() => setShowNueva(true)}
              className="mt-1 px-6 py-3 rounded-2xl text-white font-semibold text-[13px]" style={{ background: '#3B82F6' }}>
              Agregar visita
            </button>
          </div>
        ) : (
          <div className="relative pl-14">
            <div className="absolute left-10 top-2 bottom-2 w-px" style={{ background: '#1E1E2E' }} />
            <div className="flex flex-col gap-4">
              {visitas.map(v => {
                const st = STATUS_COLOR[v.status] || STATUS_COLOR.pendiente
                const tel = v.clientes?.telefono || ''
                const nombre = v.clientes?.nombre || 'Sin cliente'
                return (
                  <div key={v.id} className="relative">
                    <span className="absolute -left-14 top-3 text-[11px] text-right w-10" style={{ color: '#6B7280' }}>{v.hora?.slice(0,5)}</span>
                    <div className="absolute -left-[18px] top-3.5 w-3 h-3 rounded-full border-2"
                      style={{ background: st.dot, borderColor: '#0D0D14' }} />
                    <div className="rounded-2xl p-4" style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-white font-semibold text-[14px]">{nombre}</p>
                            <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: st.bg, color: st.text }}>{st.label}</span>
                          </div>
                          <p className="text-gray-400 text-[12px]">{v.descripcion}</p>
                          {v.direccion && <p className="text-gray-600 text-[11px] mt-0.5">📍 {v.direccion}</p>}
                          {v.notas && <p className="text-gray-600 text-[11px] mt-0.5 italic">{v.notas}</p>}
                        </div>
                        {/* acciones rápidas de status */}
                        <div className="flex gap-1">
                          {v.status === 'pendiente' && (
                            <button onClick={() => cambiarStatus(v.id, 'confirmada')}
                              className="w-7 h-7 rounded-full flex items-center justify-center"
                              style={{ background: 'rgba(34,197,94,.2)' }}>
                              <Check size={13} style={{ color: '#22C55E' }} />
                            </button>
                          )}
                          {v.status !== 'realizada' && (
                            <button onClick={() => cambiarStatus(v.id, 'realizada')}
                              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px]"
                              style={{ background: 'rgba(59,130,246,.2)', color: '#3B82F6' }}>✓✓</button>
                          )}
                          <button onClick={() => eliminar(v.id)}
                            className="w-7 h-7 rounded-full flex items-center justify-center"
                            style={{ background: 'rgba(239,68,68,.15)' }}>
                            <X size={13} style={{ color: '#EF4444' }} />
                          </button>
                        </div>
                      </div>
                      {tel && (
                        <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: '1px solid #1E1E2E' }}>
                          <a href={`tel:${tel}`}
                            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-[11px]"
                            style={{ background: 'rgba(59,130,246,.12)', color: '#3B82F6' }}>
                            <Phone size={12} /> Llamar
                          </a>
                          <a href={`https://wa.me/${tel.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-[11px]"
                            style={{ background: 'rgba(34,197,94,.12)', color: '#22C55E' }}>
                            <MessageCircle size={12} /> WhatsApp
                          </a>
                          {v.direccion && (
                            <a href={`https://maps.google.com/?q=${encodeURIComponent(v.direccion)}`} target="_blank" rel="noreferrer"
                              className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-[11px]"
                              style={{ background: 'rgba(168,85,247,.12)', color: '#A855F7' }}>
                              <MapPin size={12} /> Maps
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* modal nueva visita */}
      {showNueva && (
        <div className="fixed inset-0 z-[60] flex items-end" onClick={() => setShowNueva(false)}>
          <div className="w-full max-w-[430px] mx-auto rounded-t-3xl p-6 overflow-y-auto max-h-[85vh]"
            style={{ background: '#161622' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <p className="text-white font-bold text-[17px]">Nueva visita · {diaSeleccionado.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}</p>
              <button onClick={() => setShowNueva(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-gray-500 text-[11px] block mb-1">Cliente</label>
                <select value={form.cliente_id} onChange={e => set('cliente_id', e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-white text-[14px] outline-none appearance-none"
                  style={{ background: '#0D0D14', border: '1px solid #2A2A3A' }}>
                  <option value="">Sin cliente asignado</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="text-gray-500 text-[11px] block mb-1">Descripción *</label>
                <input value={form.descripcion} onChange={e => set('descripcion', e.target.value)}
                  placeholder="Ej: Revisión instalación gas"
                  className="w-full rounded-xl px-4 py-3 text-white text-[14px] outline-none"
                  style={{ background: '#0D0D14', border: '1px solid #2A2A3A' }} />
              </div>
              <div>
                <label className="text-gray-500 text-[11px] block mb-1">Hora</label>
                <input type="time" value={form.hora} onChange={e => set('hora', e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-white text-[14px] outline-none"
                  style={{ background: '#0D0D14', border: '1px solid #2A2A3A' }} />
              </div>
              <div>
                <label className="text-gray-500 text-[11px] block mb-1">Dirección</label>
                <input value={form.direccion} onChange={e => set('direccion', e.target.value)}
                  placeholder="Opcional"
                  className="w-full rounded-xl px-4 py-3 text-white text-[14px] outline-none"
                  style={{ background: '#0D0D14', border: '1px solid #2A2A3A' }} />
              </div>
              <div>
                <label className="text-gray-500 text-[11px] block mb-1">Notas</label>
                <textarea value={form.notas} onChange={e => set('notas', e.target.value)}
                  placeholder="Opcional" rows={2}
                  className="w-full rounded-xl px-4 py-3 text-white text-[14px] outline-none resize-none"
                  style={{ background: '#0D0D14', border: '1px solid #2A2A3A' }} />
              </div>
            </div>
            <button onClick={guardar} disabled={guardando || !form.descripcion.trim()}
              className="w-full py-4 rounded-2xl text-white font-bold text-[15px] mt-5 disabled:opacity-50"
              style={{ background: '#3B82F6' }}>
              {guardando ? 'Guardando...' : 'Guardar visita'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
