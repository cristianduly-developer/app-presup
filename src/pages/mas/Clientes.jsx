import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Search, X, Check, Pencil, Trash2 } from 'lucide-react'
import { useClientes } from '../../lib/useClientes'

import { fmt, waMe } from '../../lib/fmt'

const CLASIFICACION = {
  excelente: { label: 'Excelente',  color: '#22C55E', emoji: '🟢' },
  normal:    { label: 'Normal',     color: '#9CA3AF', emoji: '🟡' },
  riesgoso:  { label: 'Riesgoso',  color: '#EF4444', emoji: '🔴' },
}

export default function Clientes() {
  const navigate = useNavigate()
  const { clientes, loading, crear, actualizar, eliminar } = useClientes()
  const [busqueda, setBusqueda] = useState('')
  const [showNuevo, setShowNuevo] = useState(false)
  const [form, setForm] = useState({ nombre: '', telefono: '', email: '', direccion: '', clasificacion: 'normal' })
  const [guardando, setGuardando] = useState(false)
  const [errorGuardar, setErrorGuardar] = useState('')

  // editar
  const [editando, setEditando] = useState(null) // cliente objeto
  const [formEdit, setFormEdit] = useState({})
  const [guardandoEdit, setGuardandoEdit] = useState(false)

  // eliminar
  const [confirmEliminar, setConfirmEliminar] = useState(null) // cliente objeto

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setE = (k, v) => setFormEdit(f => ({ ...f, [k]: v }))

  function abrirEditar(c) {
    setEditando(c)
    setFormEdit({ nombre: c.nombre || '', telefono: c.telefono || '', email: c.email || '', direccion: c.direccion || '', clasificacion: c.clasificacion || 'normal' })
  }

  async function guardarEditar() {
    if (!formEdit.nombre.trim()) return
    setGuardandoEdit(true)
    await actualizar(editando.id, formEdit)
    setGuardandoEdit(false)
    setEditando(null)
  }

  async function confirmarEliminar() {
    await eliminar(confirmEliminar.id)
    setConfirmEliminar(null)
  }

  async function guardar() {
    if (!form.nombre.trim()) return
    setGuardando(true)
    setErrorGuardar('')
    const { error } = await crear(form)
    setGuardando(false)
    if (error) { setErrorGuardar('No se pudo guardar. Intentá de nuevo.'); return }
    setShowNuevo(false)
    setForm({ nombre: '', telefono: '', email: '', direccion: '', clasificacion: 'normal' })
  }

  const filtrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.telefono?.includes(busqueda)
  )

  return (
    <div className="flex-1 overflow-y-auto pb-24" style={{ background: '#0D0D14' }}>
      <div className="flex items-center gap-3 px-4 pt-12 pb-4">
        <button onClick={() => navigate(-1)} className="text-gray-400"><ArrowLeft size={22} /></button>
        <h1 className="text-white font-bold text-[20px] flex-1">Clientes</h1>
        <button onClick={() => setShowNuevo(true)}
          className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#3B82F6' }}>
          <Plus size={18} className="text-white" />
        </button>
      </div>

      {/* buscador */}
      <div className="mx-4 mb-4 flex items-center gap-2 rounded-2xl px-4 py-3"
        style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
        <Search size={16} className="text-gray-500" />
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar cliente..."
          className="flex-1 bg-transparent text-white text-[14px] outline-none placeholder-gray-600" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(59,130,246,.3)', borderTopColor: '#3B82F6' }} />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-3">
          <span className="text-5xl">👥</span>
          <p className="text-white font-semibold">{busqueda ? 'Sin resultados' : 'Sin clientes'}</p>
          {!busqueda && <button onClick={() => setShowNuevo(true)}
            className="mt-2 px-6 py-3 rounded-2xl text-white font-semibold text-sm" style={{ background: '#3B82F6' }}>
            Agregar primer cliente
          </button>}
        </div>
      ) : (
        <div className="flex flex-col gap-3 px-4">
          {filtrados.map(c => {
            const cls = CLASIFICACION[c.clasificacion] || CLASIFICACION.normal
            return (
              <div key={c.id} className="rounded-2xl p-4" style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-[17px] shrink-0"
                    style={{ background: '#3B82F6' }}>
                    {c.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-semibold text-[15px]">{c.nombre}</p>
                      <span className="text-[11px]">{cls.emoji}</span>
                    </div>
                    {c.telefono && <p className="text-gray-500 text-[12px]">☎ {c.telefono}</p>}
                    {c.direccion && <p className="text-gray-500 text-[11px] truncate">📍 {c.direccion}</p>}
                  </div>
                </div>
                <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: '1px solid #1E1E2E' }}>
                  {c.telefono && (
                    <a href={waMe(c.telefono)} target="_blank" rel="noreferrer"
                      className="flex-1 py-2 rounded-xl text-[11px] font-semibold text-center"
                      style={{ background: 'rgba(34,197,94,.12)', color: '#22C55E' }}>
                      WhatsApp
                    </a>
                  )}
                  <button onClick={() => navigate(`/clientes/${c.id}`)}
                    className="flex-1 py-2 rounded-xl text-[11px] font-semibold"
                    style={{ background: 'rgba(107,114,128,.12)', color: '#9CA3AF' }}>
                    Historial
                  </button>
                  <button onClick={() => abrirEditar(c)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(59,130,246,.12)' }}>
                    <Pencil size={14} style={{ color: '#3B82F6' }} />
                  </button>
                  <button onClick={() => setConfirmEliminar(c)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(239,68,68,.1)' }}>
                    <Trash2 size={14} style={{ color: '#EF4444' }} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* modal editar cliente */}
      {editando && (
        <div className="fixed inset-0 z-[60] flex items-end" onClick={() => setEditando(null)}>
          <div className="w-full max-w-[430px] mx-auto rounded-t-3xl p-6 overflow-y-auto max-h-[85vh]"
            style={{ background: '#161622' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <p className="text-white font-bold text-[17px]">Editar cliente</p>
              <button onClick={() => setEditando(null)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="flex flex-col gap-3">
              {[['nombre','Nombre *','text'],['telefono','Teléfono / WhatsApp','tel'],['email','Email','email'],['direccion','Dirección','text']].map(([k,l,t]) => (
                <div key={k}>
                  <label className="text-gray-500 text-[11px] block mb-1">{l}</label>
                  <input type={t} value={formEdit[k] || ''} onChange={e => setE(k, e.target.value)} placeholder={l.replace(' *','')}
                    className="w-full rounded-xl px-4 py-3 text-white text-[14px] outline-none"
                    style={{ background: '#0D0D14', border: '1px solid #2A2A3A' }} />
                </div>
              ))}
              <div>
                <label className="text-gray-500 text-[11px] block mb-2">Clasificación</label>
                <div className="flex gap-2">
                  {Object.entries(CLASIFICACION).map(([k, v]) => (
                    <button key={k} onClick={() => setE('clasificacion', k)}
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
            <button onClick={guardarEditar} disabled={guardandoEdit || !formEdit.nombre?.trim()}
              className="w-full py-4 rounded-2xl text-white font-bold text-[15px] mt-5 disabled:opacity-50"
              style={{ background: '#3B82F6' }}>
              {guardandoEdit ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      )}

      {/* confirmar eliminar */}
      {confirmEliminar && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-6" style={{ background: 'rgba(0,0,0,.6)' }}>
          <div className="w-full max-w-[340px] rounded-3xl p-6" style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(239,68,68,.12)' }}>
              <Trash2 size={22} style={{ color: '#EF4444' }} />
            </div>
            <p className="text-white font-bold text-[16px] text-center mb-1">Eliminar cliente</p>
            <p className="text-gray-400 text-[13px] text-center mb-6">
              ¿Seguro que querés eliminar a <span className="text-white font-semibold">{confirmEliminar.nombre}</span>? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmEliminar(null)}
                className="flex-1 py-3 rounded-2xl text-gray-300 font-semibold text-[14px]"
                style={{ background: '#0D0D14', border: '1px solid #2A2A3A' }}>
                Cancelar
              </button>
              <button onClick={confirmarEliminar}
                className="flex-1 py-3 rounded-2xl text-white font-bold text-[14px]"
                style={{ background: '#EF4444' }}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* modal nuevo cliente */}
      {showNuevo && (
        <div className="fixed inset-0 z-[60] flex items-end" onClick={() => setShowNuevo(false)}>
          <div className="w-full max-w-[430px] mx-auto rounded-t-3xl p-6 overflow-y-auto max-h-[85vh]"
            style={{ background: '#161622' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <p className="text-white font-bold text-[17px]">Nuevo cliente</p>
              <button onClick={() => setShowNuevo(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="flex flex-col gap-3">
              {[['nombre','Nombre *','text'],['telefono','Teléfono / WhatsApp','tel'],['email','Email','email'],['direccion','Dirección','text']].map(([k,l,t]) => (
                <div key={k}>
                  <label className="text-gray-500 text-[11px] block mb-1">{l}</label>
                  <input type={t} value={form[k]} onChange={e => set(k, e.target.value)} placeholder={l.replace(' *','')}
                    className="w-full rounded-xl px-4 py-3 text-white text-[14px] outline-none"
                    style={{ background: '#0D0D14', border: '1px solid #2A2A3A' }} />
                </div>
              ))}
              <div>
                <label className="text-gray-500 text-[11px] block mb-2">Clasificación</label>
                <div className="flex gap-2">
                  {Object.entries(CLASIFICACION).map(([k, v]) => (
                    <button key={k} onClick={() => set('clasificacion', k)}
                      className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold flex items-center justify-center gap-1"
                      style={{
                        background: form.clasificacion === k ? v.color + '22' : '#0D0D14',
                        color: form.clasificacion === k ? v.color : '#6B7280',
                        border: `1px solid ${form.clasificacion === k ? v.color + '44' : '#2A2A3A'}`,
                      }}>
                      {v.emoji} {v.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {errorGuardar && <p className="text-red-400 text-[12px] text-center mt-2">{errorGuardar}</p>}
            <button onClick={guardar} disabled={guardando || !form.nombre.trim()}
              className="w-full py-4 rounded-2xl text-white font-bold text-[15px] mt-5 disabled:opacity-50"
              style={{ background: '#3B82F6' }}>
              {guardando ? 'Guardando...' : 'Guardar cliente'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
