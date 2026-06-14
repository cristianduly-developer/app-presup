import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Search, X, Check } from 'lucide-react'
import { useClientes } from '../../lib/useClientes'

function fmt(n) { return '$' + Number(n || 0).toLocaleString('es-AR') }

const CLASIFICACION = {
  excelente: { label: 'Excelente',  color: '#22C55E', emoji: '🟢' },
  normal:    { label: 'Normal',     color: '#9CA3AF', emoji: '🟡' },
  riesgoso:  { label: 'Riesgoso',  color: '#EF4444', emoji: '🔴' },
}

export default function Clientes() {
  const navigate = useNavigate()
  const { clientes, loading, crear, cargar } = useClientes()
  const [busqueda, setBusqueda] = useState('')
  const [showNuevo, setShowNuevo] = useState(false)
  const [form, setForm] = useState({ nombre: '', telefono: '', email: '', direccion: '', clasificacion: 'normal' })
  const [guardando, setGuardando] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function guardar() {
    if (!form.nombre.trim()) return
    setGuardando(true)
    await crear(form)
    setShowNuevo(false)
    setForm({ nombre: '', telefono: '', email: '', direccion: '', clasificacion: 'normal' })
    setGuardando(false)
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
                <div className="flex gap-3 mt-3 pt-3" style={{ borderTop: '1px solid #1E1E2E' }}>
                  {c.telefono && (
                    <a href={`tel:${c.telefono}`}
                      className="flex-1 py-2 rounded-xl text-[11px] font-semibold text-center"
                      style={{ background: 'rgba(59,130,246,.12)', color: '#3B82F6' }}
                      onClick={e => e.stopPropagation()}>
                      Llamar
                    </a>
                  )}
                  {c.telefono && (
                    <a href={`https://wa.me/${c.telefono.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                      className="flex-1 py-2 rounded-xl text-[11px] font-semibold text-center"
                      style={{ background: 'rgba(34,197,94,.12)', color: '#22C55E' }}
                      onClick={e => e.stopPropagation()}>
                      WhatsApp
                    </a>
                  )}
                  <button onClick={() => navigate(`/clientes/${c.id}`)}
                    className="flex-1 py-2 rounded-xl text-[11px] font-semibold"
                    style={{ background: 'rgba(107,114,128,.12)', color: '#9CA3AF' }}>
                    Ver historial
                  </button>
                </div>
              </div>
            )
          })}
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
