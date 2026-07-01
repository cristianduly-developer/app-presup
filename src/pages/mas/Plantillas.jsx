import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, X, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { usePlantillas } from '../../lib/usePlantillas'
import { usePlan, tieneFeature } from '../../lib/PlanContext'
import { fmt } from '../../lib/fmt'

const ITEM_VACIO = { tipo: 'mano_obra', descripcion: '', unidad: 'global', cantidad: 1, precio_unit: 0 }

export default function Plantillas() {
  const navigate = useNavigate()
  const plan = usePlan()
  const { plantillas, loading, crear, eliminar } = usePlantillas()

  const [expandida, setExpandida] = useState(null)
  const [showNueva, setShowNueva] = useState(false)
  const [nombre, setNombre] = useState('')
  const [items, setItems] = useState([{ ...ITEM_VACIO }])
  const [guardando, setGuardando] = useState(false)

  if (!tieneFeature(plan, 'plantillas')) return <UpgradeWall navigate={navigate} />

  const setItem = (i, k, v) => setItems(its => its.map((it, idx) => idx === i
    ? { ...it, [k]: (k === 'cantidad' || k === 'precio_unit') ? (Number(v) || 0) : v }
    : it))
  const addItem = (tipo) => setItems(its => [...its, { ...ITEM_VACIO, tipo, unidad: tipo === 'material' ? 'u' : 'global' }])
  const removeItem = i => { if (items.length > 1) setItems(its => its.filter((_, idx) => idx !== i)) }

  function cerrar() {
    setShowNueva(false)
    setNombre('')
    setItems([{ ...ITEM_VACIO }])
  }

  async function guardar() {
    if (!nombre.trim()) return
    setGuardando(true)
    const itemsValidos = items
      .filter(it => it.descripcion.trim() || it.precio_unit > 0)
      .map((it, i) => ({
        tipo: it.tipo,
        descripcion: it.descripcion.trim() || (it.tipo === 'mano_obra' ? 'Mano de obra' : 'Material'),
        unidad: it.unidad || (it.tipo === 'mano_obra' ? 'global' : 'u'),
        cantidad: it.cantidad || 1,
        precio_unit: it.precio_unit || 0,
        orden: i,
      }))
    const { error } = await crear(nombre.trim(), itemsValidos)
    setGuardando(false)
    if (!error) cerrar()
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

      <p className="text-gray-500 text-[12px] px-4 mb-4">Guardá los ítems que más usás y cargalos en un clic al crear un presupuesto</p>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(59,130,246,.3)', borderTopColor: '#3B82F6' }} />
        </div>
      ) : plantillas.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-3 px-8">
          <span className="text-5xl">📋</span>
          <p className="text-white font-semibold text-center">Sin plantillas todavía</p>
          <p className="text-gray-500 text-[13px] text-center">Guardá una desde cualquier presupuesto o creá una nueva acá</p>
          <button onClick={() => setShowNueva(true)}
            className="mt-2 px-6 py-3 rounded-2xl text-white font-semibold text-[13px]" style={{ background: '#3B82F6' }}>
            Crear plantilla
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 px-4">
          {plantillas.map(p => {
            const abierta = expandida === p.id
            const itsArr = p.items || []
            const total = itsArr.reduce((s, it) => s + (it.cantidad || 1) * (it.precio_unit || 0), 0)
            return (
              <div key={p.id} className="rounded-2xl overflow-hidden" style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
                <div className="flex items-center gap-3 p-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
                    style={{ background: '#1E1E2E' }}>📋</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-[14px]">{p.nombre}</p>
                    <p className="text-gray-500 text-[11px]">
                      {itsArr.length} {itsArr.length === 1 ? 'ítem' : 'ítems'}
                      {total > 0 ? ` · ${fmt(total)} estimado` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => navigate(`/presupuestos/nuevo?plantilla=${p.id}`)}
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
                    {itsArr.length === 0 ? (
                      <p className="text-gray-600 text-[12px] px-4 py-3">Sin ítems</p>
                    ) : itsArr.map((it, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-2.5"
                        style={{ borderBottom: i < itsArr.length - 1 ? '1px solid #1A1A28' : 'none' }}>
                        <div className="flex items-center gap-2">
                          <span>{it.tipo === 'material' ? '🔧' : '👷'}</span>
                          <p className="text-gray-300 text-[13px]">{it.descripcion}</p>
                        </div>
                        {it.precio_unit > 0 && (
                          <p className="text-gray-500 text-[12px]">{fmt((it.cantidad || 1) * it.precio_unit)}</p>
                        )}
                      </div>
                    ))}
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
        <div className="fixed inset-0 z-[60] flex items-end" onClick={cerrar}>
          <div className="w-full max-w-[430px] mx-auto rounded-t-3xl overflow-y-auto max-h-[92vh]"
            style={{ background: '#161622' }} onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between px-6 pt-6 pb-4">
              <p className="text-white font-bold text-[17px]">Nueva plantilla</p>
              <button onClick={cerrar}><X size={20} className="text-gray-400" /></button>
            </div>

            <div className="px-6 flex flex-col gap-4 pb-8">
              {/* nombre */}
              <div>
                <label className="text-gray-500 text-[11px] block mb-1.5">Nombre de la plantilla *</label>
                <input value={nombre} onChange={e => setNombre(e.target.value)}
                  placeholder="Ej: Instalación eléctrica, Plomería baño..."
                  className="w-full rounded-xl px-4 py-3 text-white text-[14px] outline-none"
                  style={{ background: '#0D0D14', border: `1px solid ${nombre ? '#3B82F6' : '#2A2A3A'}` }} />
              </div>

              {/* ítems */}
              <div>
                <label className="text-gray-500 text-[11px] block mb-2">Ítems</label>
                <div className="flex flex-col gap-2">
                  {items.map((it, i) => (
                    <div key={i} className="rounded-xl p-3 flex flex-col gap-2"
                      style={{ background: '#0D0D14', border: '1px solid #2A2A3A' }}>
                      {/* badge tipo + eliminar */}
                      <div className="flex items-center justify-between">
                        <button onClick={() => setItem(i, 'tipo', it.tipo === 'material' ? 'mano_obra' : 'material')}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                          style={{
                            background: it.tipo === 'material' ? 'rgba(59,130,246,.15)' : 'rgba(249,115,22,.15)',
                            color: it.tipo === 'material' ? '#3B82F6' : '#F97316',
                          }}>
                          {it.tipo === 'material' ? '🔧 Material' : '👷 Mano de obra'}
                        </button>
                        <button onClick={() => removeItem(i)} disabled={items.length === 1}
                          className="disabled:opacity-20 text-red-500/60">
                          <X size={14} />
                        </button>
                      </div>
                      {/* descripción */}
                      <input value={it.descripcion} onChange={e => setItem(i, 'descripcion', e.target.value)}
                        placeholder="¿Qué incluye?"
                        className="w-full bg-transparent text-white text-[13px] outline-none px-1 py-1"
                        style={{ borderBottom: '1px solid #2A2A3A' }} />
                      {/* precio */}
                      <div className="flex gap-2 items-center">
                        {it.tipo === 'material' && (
                          <input type="number" inputMode="decimal"
                            value={it.cantidad || ''} onChange={e => setItem(i, 'cantidad', e.target.value)}
                            placeholder="Cant."
                            className="w-16 bg-transparent text-white text-[12px] outline-none text-center px-1 py-1"
                            style={{ borderBottom: '1px solid #2A2A3A' }} />
                        )}
                        <input type="number" inputMode="decimal"
                          value={it.precio_unit || ''} onChange={e => setItem(i, 'precio_unit', e.target.value)}
                          placeholder="$ Precio estimado"
                          className="flex-1 bg-transparent text-white text-[12px] outline-none text-right px-1 py-1"
                          style={{ borderBottom: '1px solid #2A2A3A' }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* agregar ítem */}
                <div className="flex gap-2 mt-2">
                  <button onClick={() => addItem('mano_obra')}
                    className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold flex items-center justify-center gap-1"
                    style={{ background: 'rgba(249,115,22,.1)', color: '#F97316', border: '1px dashed rgba(249,115,22,.3)' }}>
                    <Plus size={13} /> Mano de obra
                  </button>
                  <button onClick={() => addItem('material')}
                    className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold flex items-center justify-center gap-1"
                    style={{ background: 'rgba(59,130,246,.1)', color: '#3B82F6', border: '1px dashed rgba(59,130,246,.3)' }}>
                    <Plus size={13} /> Material
                  </button>
                </div>
              </div>

              <button onClick={guardar} disabled={guardando || !nombre.trim()}
                className="w-full py-4 rounded-2xl text-white font-bold text-[15px] disabled:opacity-50"
                style={{ background: '#3B82F6' }}>
                {guardando ? 'Guardando...' : 'Guardar plantilla'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function UpgradeWall({ navigate }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 px-8 pb-24" style={{ background: '#0D0D14' }}>
      <span className="text-5xl">🔒</span>
      <p className="text-white font-bold text-[18px] text-center">Plantillas disponibles en plan Profesional</p>
      <p className="text-gray-400 text-[14px] text-center">Guardá ítems frecuentes y cargalos en segundos.</p>
      <button onClick={() => navigate(-1)} className="text-gray-500 text-[13px] underline">Volver</button>
    </div>
  )
}
