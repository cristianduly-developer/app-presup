import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, X, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { usePlantillas } from '../../lib/usePlantillas'
import { useAuth } from '../../lib/useAuth'
import { usePlan, tieneFeature } from '../../lib/PlanContext'

function fmt(n) { return '$' + Number(n || 0).toLocaleString('es-AR') }

const OFICIOS_EMOJI = {
  plomero: '💧', gasista: '🔥', electricista: '⚡', pintor: '🎨',
  albanil: '🧱', carpintero: '🪵', cerrajero: '🔑', otro: '🔧',
}

export default function Plantillas() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const plan = usePlan()
  const { plantillas, loading, crear, eliminar } = usePlantillas()

  if (!tieneFeature(plan, 'plantillas')) return <UpgradeWall feature="Plantillas por oficio" navigate={navigate} />
  const [expandida, setExpandida] = useState(null)
  const [showNueva, setShowNueva] = useState(false)
  const [form, setForm] = useState({ nombre: '', oficio: 'plomero', emoji: '💧', descripcion: '' })
  const [items, setItems] = useState([{ descripcion: '', tipo: 'material', precio: '' }])
  const [guardando, setGuardando] = useState(false)

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setItem = (i, k, v) => setItems(its => its.map((it, idx) => idx === i ? { ...it, [k]: v } : it))
  const addItem = () => setItems(its => [...its, { descripcion: '', tipo: 'material', precio: '' }])
  const removeItem = i => setItems(its => its.filter((_, idx) => idx !== i))

  async function guardar() {
    if (!form.nombre.trim()) return
    setGuardando(true)
    const itemsValidos = items.filter(it => it.descripcion.trim())
    await crear(
      { ...form, user_id: user.id },
      itemsValidos.map(it => ({ descripcion: it.descripcion, tipo: it.tipo, precio: Number(it.precio) || 0 }))
    )
    setShowNueva(false)
    setForm({ nombre: '', oficio: 'plomero', emoji: '💧', descripcion: '' })
    setItems([{ descripcion: '', tipo: 'material', precio: '' }])
    setGuardando(false)
  }

  return (
    <div className="flex-1 overflow-y-auto pb-24" style={{ background: '#0D0D14' }}>
      <div className="flex items-center gap-3 px-4 pt-12 pb-4">
        <button onClick={() => navigate(-1)} className="text-gray-400"><ArrowLeft size={22} /></button>
        <h1 className="text-white font-bold text-[20px] flex-1">Plantillas</h1>
        <button onClick={() => setShowNueva(true)}
          className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#3B82F6' }}>
          <Plus size={18} className="text-white" />
        </button>
      </div>

      <p className="text-gray-500 text-[12px] px-4 mb-4">Creá presupuestos más rápido con plantillas por tipo de trabajo</p>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(59,130,246,.3)', borderTopColor: '#3B82F6' }} />
        </div>
      ) : plantillas.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-3 px-8">
          <span className="text-5xl">📋</span>
          <p className="text-white font-semibold text-center">Sin plantillas todavía</p>
          <p className="text-gray-500 text-[13px] text-center">Creá una plantilla con los ítems que más usás y ahorrá tiempo en cada presupuesto</p>
          <button onClick={() => setShowNueva(true)}
            className="mt-2 px-6 py-3 rounded-2xl text-white font-semibold text-[13px]" style={{ background: '#3B82F6' }}>
            Crear primera plantilla
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 px-4">
          {plantillas.map(p => {
            const abierta = expandida === p.id
            const total = (p.plantilla_items || []).reduce((s, it) => s + (it.precio || 0), 0)
            const emoji = p.emoji || OFICIOS_EMOJI[p.oficio] || '🔧'
            return (
              <div key={p.id} className="rounded-2xl overflow-hidden" style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
                <div className="flex items-center gap-3 p-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                    style={{ background: '#1E1E2E' }}>{emoji}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-[14px]">{p.nombre}</p>
                    <p className="text-gray-500 text-[11px]">{p.plantilla_items?.length || 0} ítems · {fmt(total)} estimado</p>
                    {p.usos > 0 && <p className="text-gray-600 text-[10px]">Usada {p.usos} {p.usos === 1 ? 'vez' : 'veces'}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { navigate(`/presupuestos/nuevo?plantilla=${p.id}`) }}
                      className="px-3 py-2 rounded-xl text-[11px] font-semibold"
                      style={{ background: '#3B82F6', color: '#fff' }}>
                      Usar
                    </button>
                    <button onClick={() => setExpandida(abierta ? null : p.id)} className="text-gray-500">
                      {abierta ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>
                </div>

                {abierta && (
                  <div style={{ borderTop: '1px solid #1E1E2E' }}>
                    {(p.plantilla_items || []).length === 0 ? (
                      <p className="text-gray-600 text-[12px] px-4 py-3">Sin ítems</p>
                    ) : (
                      (p.plantilla_items || []).map((it, i) => (
                        <div key={i} className="flex items-center justify-between px-4 py-2.5"
                          style={{ borderBottom: i < p.plantilla_items.length - 1 ? '1px solid #1A1A28' : 'none' }}>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                              style={{ background: it.tipo === 'material' ? 'rgba(59,130,246,.2)' : 'rgba(168,85,247,.2)', color: it.tipo === 'material' ? '#3B82F6' : '#A855F7' }}>
                              {it.tipo === 'material' ? 'MAT' : 'MO'}
                            </span>
                            <p className="text-gray-300 text-[13px]">{it.descripcion}</p>
                          </div>
                          {it.precio > 0 && <p className="text-gray-500 text-[12px]">{fmt(it.precio)}</p>}
                        </div>
                      ))
                    )}
                    <div className="flex justify-end px-4 py-3">
                      <button onClick={() => eliminar(p.id)}
                        className="flex items-center gap-1 text-[11px]" style={{ color: '#EF4444' }}>
                        <Trash2 size={13} /> Eliminar plantilla
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* modal nueva plantilla */}
      {showNueva && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowNueva(false)}>
          <div className="w-full max-w-[430px] mx-auto rounded-t-3xl overflow-y-auto max-h-[90vh]"
            style={{ background: '#161622' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-6 pb-4">
              <p className="text-white font-bold text-[17px]">Nueva plantilla</p>
              <button onClick={() => setShowNueva(false)}><X size={20} className="text-gray-400" /></button>
            </div>

            <div className="px-6 flex flex-col gap-4 pb-6">
              {/* nombre */}
              <div>
                <label className="text-gray-500 text-[11px] block mb-1.5">Nombre *</label>
                <input value={form.nombre} onChange={e => setF('nombre', e.target.value)}
                  placeholder="Ej: Cambio de termotanque"
                  className="w-full rounded-xl px-4 py-3 text-white text-[14px] outline-none"
                  style={{ background: '#0D0D14', border: '1px solid #2A2A3A' }} />
              </div>

              {/* oficio + emoji */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-gray-500 text-[11px] block mb-1.5">Oficio</label>
                  <select value={form.oficio} onChange={e => { setF('oficio', e.target.value); setF('emoji', OFICIOS_EMOJI[e.target.value] || '🔧') }}
                    className="w-full rounded-xl px-4 py-3 text-white text-[14px] outline-none appearance-none"
                    style={{ background: '#0D0D14', border: '1px solid #2A2A3A' }}>
                    {Object.keys(OFICIOS_EMOJI).map(o => <option key={o} value={o} style={{ background: '#161622' }}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
                  </select>
                </div>
                <div className="w-20">
                  <label className="text-gray-500 text-[11px] block mb-1.5">Emoji</label>
                  <input value={form.emoji} onChange={e => setF('emoji', e.target.value)}
                    className="w-full rounded-xl px-4 py-3 text-white text-[20px] text-center outline-none"
                    style={{ background: '#0D0D14', border: '1px solid #2A2A3A' }} />
                </div>
              </div>

              {/* ítems */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-gray-500 text-[11px]">Ítems</label>
                  <button onClick={addItem} className="text-[11px] font-semibold" style={{ color: '#3B82F6' }}>+ Agregar ítem</button>
                </div>
                <div className="flex flex-col gap-2">
                  {items.map((it, i) => (
                    <div key={i} className="rounded-xl p-3 flex flex-col gap-2" style={{ background: '#0D0D14', border: '1px solid #2A2A3A' }}>
                      <div className="flex gap-2">
                        <input value={it.descripcion} onChange={e => setItem(i, 'descripcion', e.target.value)}
                          placeholder="Descripción del ítem"
                          className="flex-1 bg-transparent text-white text-[13px] outline-none"
                          style={{ borderBottom: '1px solid #2A2A3A' }} />
                        {items.length > 1 && (
                          <button onClick={() => removeItem(i)}><X size={14} className="text-gray-600" /></button>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <select value={it.tipo} onChange={e => setItem(i, 'tipo', e.target.value)}
                          className="rounded-lg px-2 py-1 text-[11px] outline-none appearance-none"
                          style={{ background: '#161622', color: it.tipo === 'material' ? '#3B82F6' : '#A855F7', border: '1px solid #2A2A3A' }}>
                          <option value="material">Material</option>
                          <option value="mano_obra">Mano de obra</option>
                        </select>
                        <input type="number" value={it.precio} onChange={e => setItem(i, 'precio', e.target.value)}
                          placeholder="Precio estimado"
                          className="flex-1 bg-transparent text-white text-[12px] outline-none text-right"
                          style={{ borderBottom: '1px solid #2A2A3A' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={guardar} disabled={guardando || !form.nombre.trim()}
                className="w-full py-4 rounded-2xl text-white font-bold text-[15px] disabled:opacity-50"
                style={{ background: '#3B82F6' }}>
                {guardando ? 'Guardando...' : 'Crear plantilla'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function UpgradeWall({ feature, navigate }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 px-8 pb-24" style={{ background: '#0D0D14' }}>
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
        style={{ background: 'rgba(59,130,246,.15)', border: '1px solid rgba(59,130,246,.3)' }}>
        <span className="text-4xl">🔒</span>
      </div>
      <div className="text-center">
        <p className="text-white font-bold text-[18px] mb-2">{feature}</p>
        <p className="text-gray-400 text-[14px]">Esta función está disponible desde el plan Profesional.</p>
      </div>
      <div className="rounded-2xl p-4 w-full text-center" style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
        <p className="text-gray-500 text-[12px] mb-1">Tu plan actual</p>
        <p className="text-white font-bold text-[16px]">Básico</p>
      </div>
      <button onClick={() => navigate(-1)}
        className="text-gray-500 text-[13px] underline">
        Volver
      </button>
    </div>
  )
}
