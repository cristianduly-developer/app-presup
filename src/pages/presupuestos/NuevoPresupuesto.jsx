import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Check } from 'lucide-react'
import { usePresupuestos } from '../../lib/usePresupuestos'
import { useClientes } from '../../lib/useClientes'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/useAuth'
import { usePlan, LIMITES } from '../../lib/PlanContext'

function fmt(n) { return '$' + Number(n || 0).toLocaleString('es-AR') }

const ITEM_VACIO = { tipo: 'mano_obra', descripcion: '', unidad: 'global', cantidad: 1, precio_unit: 0 }

export default function NuevoPresupuesto() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const plantillaId = searchParams.get('plantilla')

  const { crear } = usePresupuestos()
  const { clientes, crear: crearCliente } = useClientes()
  const { user } = useAuth()
  const plan = usePlan()
  const [limiteError, setLimiteError] = useState('')

  const [step, setStep] = useState(1)
  const [clienteId, setClienteId] = useState('')
  const [clienteNuevo, setClienteNuevo] = useState({ nombre: '', telefono: '', direccion: '' })
  const [modoCliente, setModoCliente] = useState('existente')
  const [vigencia, setVigencia] = useState(5)
  const [notas, setNotas] = useState('')
  const [items, setItems] = useState([{ ...ITEM_VACIO }])
  const [guardando, setGuardando] = useState(false)
  const [plantillaNombre, setPlantillaNombre] = useState('')

  // cargar plantilla si viene por URL
  useEffect(() => {
    if (!plantillaId) return
    async function cargarPlantilla() {
      const { data } = await supabase
        .from('plantillas')
        .select('*, plantilla_items(*)')
        .eq('id', plantillaId)
        .single()
      if (!data) return
      setPlantillaNombre(data.nombre)
      if (data.plantilla_items?.length) {
        setItems(data.plantilla_items.map(it => ({
          tipo:        it.tipo || 'material',
          descripcion: it.descripcion || '',
          unidad:      it.tipo === 'material' ? 'u' : 'global',
          cantidad:    1,
          precio_unit: it.precio || 0,
        })))
      }
      // incrementar usos
      await supabase.from('plantillas').update({ usos: data.usos + 1 }).eq('id', plantillaId)
    }
    cargarPlantilla()
  }, [plantillaId])

  const totalMat = items.filter(i => i.tipo === 'material').reduce((s, i) => s + i.cantidad * i.precio_unit, 0)
  const totalMO  = items.filter(i => i.tipo === 'mano_obra').reduce((s, i) => s + i.cantidad * i.precio_unit, 0)
  const total    = totalMat + totalMO
  const margen   = total - totalMat

  function setItem(idx, key, val) {
    setItems(prev => prev.map((it, i) => i === idx
      ? { ...it, [key]: (key === 'cantidad' || key === 'precio_unit') ? (Number(val) || 0) : val }
      : it))
  }
  function addItem(tipo) {
    setItems(prev => [...prev, { ...ITEM_VACIO, tipo, unidad: tipo === 'material' ? 'u' : 'global' }])
  }
  function removeItem(idx) {
    if (items.length === 1) return
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  async function guardar(status = 'borrador') {
    const limite = LIMITES[plan]?.presupuestos ?? 50
    if (limite !== Infinity) {
      const inicio = new Date(); inicio.setDate(1); inicio.setHours(0,0,0,0)
      const { count } = await supabase.from('presupuestos')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', inicio.toISOString())
      if (count >= limite) {
        setLimiteError(`Tu plan ${plan} permite hasta ${limite} presupuestos por mes. Ya usaste ${count}.`)
        return
      }
    }
    setGuardando(true)
    let cId = clienteId
    if (modoCliente === 'nuevo' && clienteNuevo.nombre) {
      const { data } = await crearCliente(clienteNuevo)
      cId = data?.id
    }
    const { data, error } = await crear(
      { cliente_id: cId || null, vigencia_dias: vigencia, notas_internas: notas, status },
      items.filter(i => i.descripcion.trim())
    )
    setGuardando(false)
    if (!error && data) navigate(`/presupuestos/${data.id}`)
  }

  return (
    <div className="flex-1 overflow-y-auto pb-32" style={{ background: '#0D0D14' }}>
      {/* header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4 sticky top-0 z-10" style={{ background: '#0D0D14' }}>
        <button onClick={() => step > 1 ? setStep(s => s - 1) : navigate(-1)} className="text-gray-400">
          <ArrowLeft size={22} />
        </button>
        <div className="flex-1">
          <p className="text-white font-bold text-[17px]">Nuevo presupuesto</p>
          <p className="text-gray-500 text-[12px]">
            {plantillaNombre ? `📋 ${plantillaNombre}` : `Paso ${step} de 3`}
          </p>
        </div>
        <div className="flex gap-1.5">
          {[1,2,3].map(s => (
            <div key={s} className="h-1.5 rounded-full transition-all"
              style={{ width: s === step ? 24 : 8, background: s <= step ? '#3B82F6' : '#2A2A3A' }} />
          ))}
        </div>
      </div>

      {/* ── PASO 1: Cliente ── */}
      {step === 1 && (
        <div className="px-4 flex flex-col gap-4">
          <p className="text-gray-400 text-[13px]">¿Para quién es el presupuesto?</p>

          <div className="flex gap-2 p-1 rounded-2xl" style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
            {[['existente', 'Cliente existente'], ['nuevo', 'Nuevo cliente']].map(([k, l]) => (
              <button key={k} onClick={() => setModoCliente(k)}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold"
                style={{ background: modoCliente === k ? '#3B82F6' : 'transparent', color: modoCliente === k ? '#fff' : '#6B7280' }}>
                {l}
              </button>
            ))}
          </div>

          {modoCliente === 'existente' ? (
            <div className="flex flex-col gap-2">
              {clientes.length === 0
                ? <p className="text-gray-500 text-[13px] text-center py-4">No tenés clientes. Creá uno nuevo.</p>
                : clientes.map(c => (
                  <button key={c.id} onClick={() => setClienteId(c.id)}
                    className="flex items-center gap-3 p-4 rounded-2xl text-left"
                    style={{
                      background: clienteId === c.id ? 'rgba(59,130,246,.1)' : '#161622',
                      border: clienteId === c.id ? '1px solid #3B82F6' : '1px solid #1E1E2E',
                    }}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                      style={{ background: '#3B82F6' }}>
                      {c.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-semibold text-[14px]">{c.nombre}</p>
                      {c.telefono && <p className="text-gray-500 text-[12px]">{c.telefono}</p>}
                    </div>
                    {clienteId === c.id && <Check size={18} className="text-blue-400 shrink-0" />}
                  </button>
                ))
              }
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {[['nombre','Nombre completo *','text'],['telefono','Teléfono / WhatsApp','tel'],['direccion','Dirección','text']].map(([k,l,t]) => (
                <div key={k}>
                  <label className="text-gray-500 text-[11px] mb-1 block">{l}</label>
                  <input type={t} value={clienteNuevo[k]}
                    onChange={e => setClienteNuevo(p => ({ ...p, [k]: e.target.value }))}
                    placeholder={l.replace(' *','')}
                    className="w-full rounded-2xl px-4 py-3.5 text-white text-[14px] outline-none"
                    style={{ background: '#161622', border: '1px solid #1E1E2E' }} />
                </div>
              ))}
            </div>
          )}

          <div>
            <label className="text-gray-500 text-[11px] mb-2 block">Vigencia del presupuesto</label>
            <div className="flex gap-2">
              {[3,5,7,10,15].map(d => (
                <button key={d} onClick={() => setVigencia(d)}
                  className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold"
                  style={{ background: vigencia === d ? '#3B82F6' : '#161622', color: vigencia === d ? '#fff' : '#6B7280', border: vigencia === d ? 'none' : '1px solid #1E1E2E' }}>
                  {d}d
                </button>
              ))}
            </div>
          </div>

          <button onClick={() => setStep(2)}
            disabled={modoCliente === 'existente' && !clienteId && clientes.length > 0}
            className="w-full py-4 rounded-2xl text-white font-bold text-[15px] mt-2 disabled:opacity-50"
            style={{ background: '#3B82F6' }}>
            Siguiente → Agregar ítems
          </button>
        </div>
      )}

      {/* ── PASO 2: Items ── */}
      {step === 2 && (
        <div className="px-4 flex flex-col gap-4">
          {plantillaNombre && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: 'rgba(59,130,246,.1)', border: '1px solid rgba(59,130,246,.3)' }}>
              <span className="text-[13px]">📋</span>
              <p className="text-blue-400 text-[12px]">Ítems cargados desde <strong>{plantillaNombre}</strong>. Podés editarlos.</p>
            </div>
          )}

          <p className="text-gray-400 text-[13px]">Agregá materiales y mano de obra</p>

          <div className="rounded-2xl p-3 flex justify-between items-center"
            style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
            <div className="text-center">
              <p className="text-gray-500 text-[10px]">Materiales</p>
              <p className="text-blue-400 font-bold text-[14px]">{fmt(totalMat)}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-500 text-[10px]">Mano de obra</p>
              <p className="text-orange-400 font-bold text-[14px]">{fmt(totalMO)}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-500 text-[10px]">Total</p>
              <p className="text-white font-bold text-[16px]">{fmt(total)}</p>
            </div>
          </div>

          {items.map((item, idx) => (
            <div key={idx} className="rounded-2xl p-4" style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex gap-2">
                  {[['material','🔧 Material'],['mano_obra','👷 M. de obra']].map(([k,l]) => (
                    <button key={k} onClick={() => setItem(idx, 'tipo', k)}
                      className="px-3 py-1 rounded-full text-[11px] font-semibold"
                      style={{
                        background: item.tipo === k ? (k === 'material' ? 'rgba(59,130,246,.2)' : 'rgba(249,115,22,.2)') : '#0D0D14',
                        color: item.tipo === k ? (k === 'material' ? '#3B82F6' : '#F97316') : '#6B7280',
                      }}>
                      {l}
                    </button>
                  ))}
                </div>
                <button onClick={() => removeItem(idx)} className="text-red-500/60 disabled:opacity-30" disabled={items.length === 1}>
                  <Trash2 size={16} />
                </button>
              </div>

              <input value={item.descripcion} onChange={e => setItem(idx,'descripcion',e.target.value)}
                placeholder="Descripción del ítem"
                className="w-full rounded-xl px-3 py-2.5 text-white text-[13px] outline-none mb-3"
                style={{ background: '#0D0D14', border: '1px solid #2A2A3A' }} />

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-gray-600 text-[10px]">Cant.</label>
                  <input type="number" value={item.cantidad} onChange={e => setItem(idx,'cantidad',e.target.value)}
                    className="w-full rounded-xl px-3 py-2 text-white text-[13px] outline-none mt-1"
                    style={{ background: '#0D0D14', border: '1px solid #2A2A3A' }} />
                </div>
                <div className="w-16">
                  <label className="text-gray-600 text-[10px]">Unidad</label>
                  <input value={item.unidad} onChange={e => setItem(idx,'unidad',e.target.value)}
                    className="w-full rounded-xl px-3 py-2 text-white text-[13px] outline-none mt-1"
                    style={{ background: '#0D0D14', border: '1px solid #2A2A3A' }} />
                </div>
                <div className="flex-[2]">
                  <label className="text-gray-600 text-[10px]">Precio unitario</label>
                  <input type="number" value={item.precio_unit || ''} onChange={e => setItem(idx,'precio_unit',e.target.value)}
                    placeholder="0"
                    className="w-full rounded-xl px-3 py-2 text-white text-[13px] outline-none mt-1"
                    style={{ background: '#0D0D14', border: '1px solid #2A2A3A' }} />
                </div>
              </div>

              {item.cantidad > 0 && item.precio_unit > 0 && (
                <p className="text-right mt-2 font-bold text-[14px]"
                  style={{ color: item.tipo === 'material' ? '#3B82F6' : '#F97316' }}>
                  Subtotal: {fmt(item.cantidad * item.precio_unit)}
                </p>
              )}
            </div>
          ))}

          <div className="flex gap-3">
            <button onClick={() => addItem('material')}
              className="flex-1 py-3 rounded-2xl text-[13px] font-semibold flex items-center justify-center gap-2"
              style={{ background: 'rgba(59,130,246,.12)', color: '#3B82F6', border: '1px dashed rgba(59,130,246,.3)' }}>
              <Plus size={16} /> Material
            </button>
            <button onClick={() => addItem('mano_obra')}
              className="flex-1 py-3 rounded-2xl text-[13px] font-semibold flex items-center justify-center gap-2"
              style={{ background: 'rgba(249,115,22,.12)', color: '#F97316', border: '1px dashed rgba(249,115,22,.3)' }}>
              <Plus size={16} /> Mano de obra
            </button>
          </div>

          <div>
            <label className="text-gray-500 text-[11px] mb-1 block">Notas internas (solo vos las ves)</label>
            <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={3}
              placeholder="Observaciones, acuerdos con el cliente..."
              className="w-full rounded-2xl px-4 py-3 text-white text-[13px] outline-none resize-none"
              style={{ background: '#161622', border: '1px solid #1E1E2E' }} />
          </div>

          <button onClick={() => setStep(3)}
            className="w-full py-4 rounded-2xl text-white font-bold text-[15px]"
            style={{ background: '#3B82F6' }}>
            Ver resumen →
          </button>
        </div>
      )}

      {/* ── PASO 3: Resumen ── */}
      {step === 3 && (
        <div className="px-4 flex flex-col gap-4">
          <p className="text-gray-400 text-[13px]">Revisá antes de guardar</p>

          <div className="rounded-2xl p-5 text-center" style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
            <p className="text-gray-500 text-[12px] mb-1">Total presupuestado</p>
            <p className="text-white font-bold text-[36px]">{fmt(total)}</p>
            <div className="flex justify-center gap-6 mt-3">
              <div><p className="text-gray-500 text-[10px]">Materiales</p><p className="text-blue-400 font-bold text-[14px]">{fmt(totalMat)}</p></div>
              <div><p className="text-gray-500 text-[10px]">Mano de obra</p><p className="text-orange-400 font-bold text-[14px]">{fmt(totalMO)}</p></div>
              <div><p className="text-gray-500 text-[10px]">Margen est.</p><p className="text-green-400 font-bold text-[14px]">{fmt(margen)}</p></div>
            </div>
          </div>

          <div className="rounded-2xl p-4 flex flex-col gap-2" style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
            <p className="text-gray-500 text-[11px] font-semibold tracking-wider mb-1">
              ÍTEMS ({items.filter(i => i.descripcion).length})
            </p>
            {items.filter(i => i.descripcion).map((it, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>{it.tipo === 'material' ? '🔧' : '👷'}</span>
                  <span className="text-white text-[13px]">{it.descripcion}</span>
                  {it.cantidad > 1 && <span className="text-gray-600 text-[11px]">x{it.cantidad}</span>}
                </div>
                <span className="text-gray-400 text-[12px]">{fmt(it.cantidad * it.precio_unit)}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 mt-2">
            {limiteError && (
              <div className="rounded-2xl p-4 text-center" style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)' }}>
                <p className="text-red-400 text-[13px]">🚫 {limiteError}</p>
                <p className="text-gray-500 text-[11px] mt-1">Mejorá tu plan para seguir creando</p>
              </div>
            )}
            <button onClick={() => guardar('borrador')} disabled={guardando}
              className="w-full py-4 rounded-2xl font-bold text-[15px] disabled:opacity-50"
              style={{ background: '#161622', color: '#9CA3AF', border: '1px solid #2A2A3A' }}>
              Guardar borrador
            </button>
            <button onClick={() => guardar('enviado')} disabled={guardando}
              className="w-full py-4 rounded-2xl text-white font-bold text-[15px] flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: '#3B82F6' }}>
              {guardando
                ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando...</>
                : 'Guardar presupuesto'
              }
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
