import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Check, Zap, ChevronDown } from 'lucide-react'
import { usePresupuestos } from '../../lib/usePresupuestos'
import { useClientes } from '../../lib/useClientes'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/useAuth'
import { usePlan, LIMITES, tieneFeature } from '../../lib/PlanContext'

import { fmt } from '../../lib/fmt'

const ITEM_VACIO   = { tipo: 'mano_obra', descripcion: '', unidad: 'global', cantidad: 1, precio_unit: 0 }
const SECCION_VACIA = { tipo: 'seccion', descripcion: '', unidad: '', cantidad: 0, precio_unit: 0 }

export default function NuevoPresupuesto() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const plantillaId = searchParams.get('plantilla')

  const { crear } = usePresupuestos()
  const { clientes, crear: crearCliente } = useClientes()
  const { user } = useAuth()
  const plan = usePlan()
  const [limiteError, setLimiteError] = useState('')

  const editarId = searchParams.get('editar')
  const [step, setStep] = useState(1)
  const [titulo, setTitulo] = useState('')
  const [plantillasDisp, setPlantillasDisp] = useState([])
  const [sugerencias, setSugerencias] = useState([])
  const [plantillaAplicada, setPlantillaAplicada] = useState(null)
  const [clienteId, setClienteId] = useState('')
  const [clienteNuevo, setClienteNuevo] = useState({ nombre: '', telefono: '', direccion: '' })
  const [modoCliente, setModoCliente] = useState('existente')
  const [vigencia, setVigencia] = useState(5)
  const [notas, setNotas] = useState('')
  const [items, setItems] = useState([{ ...ITEM_VACIO }])
  const [guardando, setGuardando] = useState(false)
  const [plantillaNombre, setPlantillaNombre] = useState('')
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [notasOpen, setNotasOpen] = useState(false)

  // cargar plantillas disponibles (solo si el plan las incluye)
  useEffect(() => {
    if (!tieneFeature(plan, 'plantillas')) return
    supabase.from('plantillas').select('*, plantilla_items(*)')
      .order('usos', { ascending: false })
      .then(({ data }) => setPlantillasDisp(data || []))
  }, [plan])

  // sugerir plantillas mientras escribe el título
  useEffect(() => {
    if (!titulo.trim() || plantillasDisp.length === 0 || plantillaAplicada) {
      setSugerencias([])
      return
    }
    const q = titulo.toLowerCase()
    const matches = plantillasDisp.filter(p =>
      p.nombre.toLowerCase().includes(q) ||
      q.split(' ').some(w => w.length > 2 && p.nombre.toLowerCase().includes(w))
    ).slice(0, 3)
    setSugerencias(matches)
  }, [titulo, plantillasDisp])

  function aplicarPlantilla(pl) {
    setPlantillaAplicada(pl.nombre)
    setSugerencias([])
    if (pl.nombre && !titulo) setTitulo(pl.nombre)
    if (pl.plantilla_items?.length) {
      setItems(pl.plantilla_items.map(it => ({
        tipo:        it.tipo || 'material',
        descripcion: it.descripcion || '',
        unidad:      it.tipo === 'mano_obra' ? 'global' : 'u',
        cantidad:    1,
        precio_unit: it.precio || 0,
      })))
    }
    supabase.from('plantillas').update({ usos: (pl.usos || 0) + 1 }).eq('id', pl.id)
  }

  // cargar presupuesto existente para editar y saltar al paso 2
  useEffect(() => {
    if (!editarId) return
    async function cargarEditar() {
      const { data } = await supabase
        .from('presupuestos')
        .select('*, presupuesto_items(*)')
        .eq('id', editarId)
        .single()
      if (!data) return
      setTitulo(data.titulo || '')
      setClienteId(data.cliente_id || '')
      setModoCliente('existente')
      setVigencia(data.vigencia_dias || 5)
      setNotas(data.notas_internas || '')
      if (data.presupuesto_items?.length) {
        setItems(data.presupuesto_items.sort((a,b) => a.orden - b.orden).map(it => ({
          tipo: it.tipo, descripcion: it.descripcion, unidad: it.unidad,
          cantidad: it.cantidad, precio_unit: it.precio_unit,
        })))
      }
      setStep(1) // en modo edición arrancar desde el paso 1 para permitir editar cliente/vigencia
    }
    cargarEditar()
  }, [editarId])

  // cargar plantilla si viene por URL
  useEffect(() => {
    if (!plantillaId) return
    if (!tieneFeature(plan, 'plantillas')) return  // guard de plan
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

  function addSeccion() {
    setItems(prev => {
      // si no hay ninguna sección todavía, insertar antes del primer ítem
      const yaHaySeccion = prev.some(i => i.tipo === 'seccion')
      if (!yaHaySeccion) return [{ ...SECCION_VACIA }, ...prev]
      return [...prev, { ...SECCION_VACIA }]
    })
  }
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
    setGuardando(true)

    try {

    if (editarId) {
      // modo edición: UPDATE del presupuesto existente
      let cId = clienteId
      if (modoCliente === 'nuevo' && clienteNuevo.nombre) {
        const { data } = await crearCliente(clienteNuevo)
        cId = data?.id
      }
      const filtrados = items.filter(i => i.tipo === 'seccion' || i.precio_unit > 0 || i.descripcion.trim()).map(i => ({ ...i, descripcion: i.descripcion.trim() || (i.tipo === 'mano_obra' ? 'Mano de obra' : i.tipo === 'seccion' ? 'Etapa' : 'Material') }))
      const totalMat2 = filtrados.filter(i => i.tipo === 'material').reduce((s, i) => s + i.cantidad * i.precio_unit, 0)
      const totalMO2  = filtrados.filter(i => i.tipo === 'mano_obra').reduce((s, i) => s + i.cantidad * i.precio_unit, 0)
      // secciones no aportan al total
      const total2    = totalMat2 + totalMO2
      const fechaVence = vigencia
        ? new Date(Date.now() + vigencia * 86400000).toISOString().split('T')[0] : null

      const { error: editErr } = await supabase.rpc('actualizar_presupuesto', {
        p_id:               editarId,
        p_titulo:           titulo,
        p_cliente_id:       cId || null,
        p_vigencia_dias:    vigencia,
        p_notas_internas:   notas,
        p_total:            total2,
        p_total_materiales: totalMat2,
        p_total_mano_obra:  totalMO2,
        p_margen_estimado:  total2 - totalMat2,
        p_fecha_vence:      fechaVence,
        p_items: filtrados.map((it, i) => ({
          tipo:        it.tipo,
          descripcion: it.descripcion,
          unidad:      it.unidad || '',
          cantidad:    it.tipo === 'seccion' ? 0 : it.cantidad,
          precio_unit: it.tipo === 'seccion' ? 0 : it.precio_unit,
          orden:       i,
        })),
      })
      setGuardando(false)
      if (editErr) { setLimiteError('No se pudo guardar. Intentá de nuevo.'); return }
      navigate(`/presupuestos/${editarId}`)
      return
    }

    // modo creación
    const limite = LIMITES[plan]?.presupuestos ?? 50
    if (limite !== Infinity) {
      const inicio = new Date(); inicio.setDate(1); inicio.setHours(0,0,0,0)
      const { count } = await supabase.from('presupuestos')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', inicio.toISOString())
      if (count >= limite) {
        setGuardando(false)
        setLimiteError(`Tu plan ${plan} permite hasta ${limite} presupuestos por mes. Ya usaste ${count}.`)
        return
      }
    }
    let cId = clienteId
    if (modoCliente === 'nuevo' && clienteNuevo.nombre) {
      const { data } = await crearCliente(clienteNuevo)
      cId = data?.id
    }
    const { data, error } = await crear(
      { titulo, cliente_id: cId || null, vigencia_dias: vigencia, notas_internas: notas, status },
      items.filter(i => i.tipo === 'seccion' || i.precio_unit > 0 || i.descripcion.trim()).map(i => ({ ...i, descripcion: i.descripcion.trim() || (i.tipo === 'mano_obra' ? 'Mano de obra' : i.tipo === 'seccion' ? 'Etapa' : 'Material') }))
    )
    setGuardando(false)
    if (!error && data) navigate(`/presupuestos/${data.id}`)
    else if (error) setLimiteError('No se pudo guardar el presupuesto. Verificá tu conexión e intentá de nuevo.')

    } catch (e) {
      console.error('[guardar]', e)
      setGuardando(false)
      setLimiteError('Ocurrió un error inesperado. Intentá de nuevo.')
    }
  }

  return (
    <div className="flex-1 overflow-y-auto pb-48" style={{ background: '#0D0D14' }}>
      {/* header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4 sticky top-0 z-10" style={{ background: '#0D0D14' }}>
        <button onClick={() => step > 1 ? setStep(s => s - 1) : navigate(-1)} className="text-gray-400">
          <ArrowLeft size={22} />
        </button>
        <div className="flex-1">
          <p className="text-white font-bold text-[17px]">{editarId ? '✎ Editar presupuesto' : 'Nuevo presupuesto'}</p>
          <p className="text-gray-500 text-[12px]">
            {editarId ? (titulo || 'Cargando...') : plantillaNombre ? `📋 ${plantillaNombre}` : `Paso ${step} de 3`}
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
          <div>
            <label className="text-gray-500 text-[11px] mb-1 block">Trabajo a realizar *</label>
            <input
              value={titulo}
              onChange={e => { setTitulo(e.target.value); setPlantillaAplicada(null) }}
              placeholder="Ej: Instalación eléctrica, Pintura exterior, Plomería baño..."
              className="w-full rounded-2xl px-4 py-3.5 text-white text-[14px] outline-none"
              style={{ background: '#161622', border: `1px solid ${titulo ? '#3B82F6' : '#1E1E2E'}` }}
            />

            {/* sugerencias de plantillas */}
            {sugerencias.length > 0 && (
              <div className="mt-2 flex flex-col gap-1.5">
                <p className="text-gray-500 text-[10px] px-1">⚡ Plantillas que coinciden — tocá para cargar ítems:</p>
                {sugerencias.map(pl => (
                  <button key={pl.id} onClick={() => aplicarPlantilla(pl)}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl text-left"
                    style={{ background: 'rgba(59,130,246,.1)', border: '1px solid rgba(59,130,246,.25)' }}>
                    <Zap size={14} className="text-blue-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-blue-300 font-semibold text-[13px]">{pl.nombre}</p>
                      <p className="text-gray-500 text-[10px]">{pl.plantilla_items?.length || 0} ítems · usado {pl.usos || 0} veces</p>
                    </div>
                    <span className="text-blue-400 text-[11px] font-semibold shrink-0">Usar →</span>
                  </button>
                ))}
              </div>
            )}

            {/* confirmación plantilla aplicada */}
            {plantillaAplicada && (
              <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.2)' }}>
                <Check size={13} className="text-green-400 shrink-0" />
                <p className="text-green-400 text-[12px]">Plantilla <strong>{plantillaAplicada}</strong> cargada — podés editar los ítems en el siguiente paso</p>
              </div>
            )}
          </div>
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
            disabled={!titulo.trim() || (modoCliente === 'existente' && !clienteId && clientes.length > 0)}
            className="w-full py-4 rounded-2xl text-white font-bold text-[15px] mt-2 disabled:opacity-50"
            style={{ background: '#3B82F6' }}>
            Siguiente → Agregar ítems
          </button>
          {titulo.trim() && !editarId && (
            <button onClick={() => guardar('borrador')} disabled={guardando}
              className="w-full py-3 rounded-2xl font-semibold text-[14px] disabled:opacity-50"
              style={{ background: 'transparent', color: '#6B7280', border: '1px solid #2A2A3A' }}>
              {guardando ? 'Guardando...' : '💾 Guardar borrador y salir'}
            </button>
          )}
        </div>
      )}

      {/* ── PASO 2: Items ── */}
      {step === 2 && (
        <div className="px-4 flex flex-col gap-3">
          {plantillaNombre && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: 'rgba(59,130,246,.1)', border: '1px solid rgba(59,130,246,.3)' }}>
              <span className="text-[13px]">📋</span>
              <p className="text-blue-400 text-[12px]">Ítems cargados desde <strong>{plantillaNombre}</strong>. Podés editarlos.</p>
            </div>
          )}

          {/* barra de totales */}
          <div className="rounded-2xl px-4 py-3 flex justify-between items-center"
            style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
            <div className="text-center">
              <p className="text-gray-500 text-[10px]">Materiales</p>
              <p className="text-blue-400 font-bold text-[13px]">{fmt(totalMat)}</p>
            </div>
            <div className="w-px h-8" style={{ background: '#2A2A3A' }} />
            <div className="text-center">
              <p className="text-gray-500 text-[10px]">Mano de obra</p>
              <p className="text-orange-400 font-bold text-[13px]">{fmt(totalMO)}</p>
            </div>
            <div className="w-px h-8" style={{ background: '#2A2A3A' }} />
            <div className="text-center">
              <p className="text-gray-500 text-[10px]">Total</p>
              <p className="text-white font-bold text-[15px]">{fmt(total)}</p>
            </div>
          </div>

          {/* lista de ítems */}
          {items.map((item, idx) => item.tipo === 'seccion' ? (
            <div key={idx} className="flex items-center gap-2">
              <div className="flex-1 h-px" style={{ background: '#2A2A3A' }} />
              <div className="flex items-center gap-2 rounded-xl px-3 py-2"
                style={{ background: 'rgba(168,85,247,.1)', border: '1px solid rgba(168,85,247,.3)' }}>
                <span className="text-[11px] font-bold" style={{ color: '#A855F7' }}>📌</span>
                <input
                  value={item.descripcion}
                  onChange={e => setItem(idx, 'descripcion', e.target.value)}
                  placeholder="Nombre de la etapa..."
                  className="bg-transparent outline-none text-[13px] font-bold w-40"
                  style={{ color: '#A855F7' }}
                />
              </div>
              <button onClick={() => removeItem(idx)} className="text-red-500/50 p-1">
                <Trash2 size={14} />
              </button>
              <div className="flex-1 h-px" style={{ background: '#2A2A3A' }} />
            </div>
          ) : (
            <div key={idx} className="rounded-2xl p-4" style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
              {/* header del ítem: badge de tipo + eliminar */}
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setItem(idx, 'tipo', item.tipo === 'material' ? 'mano_obra' : 'material')}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                  style={{
                    background: item.tipo === 'material' ? 'rgba(59,130,246,.15)' : 'rgba(249,115,22,.15)',
                    color: item.tipo === 'material' ? '#3B82F6' : '#F97316',
                  }}>
                  <span>{item.tipo === 'material' ? '🔧' : '👷'}</span>
                  <span>{item.tipo === 'material' ? 'Material' : 'Mano de obra'}</span>
                </button>
                <button onClick={() => removeItem(idx)} disabled={items.length === 1}
                  className="p-1 rounded-lg disabled:opacity-20 text-red-500/60 active:text-red-400">
                  <Trash2 size={16} />
                </button>
              </div>

              {/* descripción */}
              <input value={item.descripcion} onChange={e => setItem(idx,'descripcion',e.target.value)}
                placeholder="¿Qué incluye este ítem?"
                className="w-full rounded-xl px-3 py-2.5 text-white text-[14px] outline-none mb-3"
                style={{ background: '#0D0D14', border: '1px solid #2A2A3A' }} />

              {/* fila de números */}
              {item.tipo === 'mano_obra' ? (
                <div>
                  <label className="text-gray-600 text-[10px]">Precio total $</label>
                  <input type="number" inputMode="decimal" value={item.precio_unit || ''}
                    onChange={e => {
                      setItem(idx, 'precio_unit', e.target.value)
                      setItem(idx, 'cantidad', 1)
                      setItem(idx, 'unidad', 'global')
                    }}
                    placeholder="0"
                    className="w-full rounded-xl px-3 py-2.5 text-white text-[14px] outline-none mt-1"
                    style={{ background: '#0D0D14', border: '1px solid #2A2A3A' }} />
                </div>
              ) : (
                <div className="flex gap-2">
                  <div className="w-20 shrink-0">
                    <label className="text-gray-600 text-[10px]">Cant.</label>
                    <input type="number" inputMode="decimal" value={item.cantidad}
                      onChange={e => setItem(idx,'cantidad',e.target.value)}
                      className="w-full rounded-xl px-3 py-2 text-white text-[13px] outline-none mt-1 text-center"
                      style={{ background: '#0D0D14', border: '1px solid #2A2A3A' }} />
                  </div>
                  <div className="w-16 shrink-0">
                    <label className="text-gray-600 text-[10px]">Unidad</label>
                    <input value={item.unidad} onChange={e => setItem(idx,'unidad',e.target.value)}
                      className="w-full rounded-xl px-3 py-2 text-white text-[13px] outline-none mt-1 text-center"
                      style={{ background: '#0D0D14', border: '1px solid #2A2A3A' }} />
                  </div>
                  <div className="flex-1">
                    <label className="text-gray-600 text-[10px]">Precio $ {item.cantidad > 1 ? '(unitario)' : '(total o unitario)'}</label>
                    <input type="number" inputMode="decimal" value={item.precio_unit || ''}
                      onChange={e => setItem(idx,'precio_unit',e.target.value)}
                      placeholder="0"
                      className="w-full rounded-xl px-3 py-2 text-white text-[13px] outline-none mt-1"
                      style={{ background: '#0D0D14', border: '1px solid #2A2A3A' }} />
                  </div>
                </div>
              )}

              {item.cantidad > 0 && item.precio_unit > 0 && (
                <p className="text-right mt-2 font-bold text-[13px]"
                  style={{ color: item.tipo === 'material' ? '#3B82F6' : '#F97316' }}>
                  = {fmt(item.cantidad * item.precio_unit)}
                </p>
              )}
            </div>
          ))}

          {/* botón único + menú */}
          <div className="relative">
            <button
              onClick={() => setShowAddMenu(v => !v)}
              className="w-full py-3.5 rounded-2xl text-[14px] font-semibold flex items-center justify-center gap-2"
              style={{ background: 'rgba(59,130,246,.1)', color: '#3B82F6', border: '1px dashed rgba(59,130,246,.35)' }}>
              <Plus size={16} /> Agregar ítem
            </button>
            {showAddMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowAddMenu(false)} />
                <div className="absolute bottom-full left-0 right-0 mb-2 rounded-2xl overflow-hidden z-20 shadow-2xl"
                  style={{ background: '#1A1A2E', border: '1px solid #2A2A3A' }}>
                  <button onClick={() => { addItem('material'); setShowAddMenu(false) }}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-white/5"
                    style={{ borderBottom: '1px solid #2A2A3A' }}>
                    <span className="text-lg">🔧</span>
                    <div>
                      <p className="text-white font-semibold text-[14px]">Material</p>
                      <p className="text-gray-500 text-[11px]">Cemento, caños, pintura...</p>
                    </div>
                  </button>
                  <button onClick={() => { addItem('mano_obra'); setShowAddMenu(false) }}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-white/5"
                    style={{ borderBottom: '1px solid #2A2A3A' }}>
                    <span className="text-lg">👷</span>
                    <div>
                      <p className="text-white font-semibold text-[14px]">Mano de obra</p>
                      <p className="text-gray-500 text-[11px]">Instalación, mano de obra, traslado...</p>
                    </div>
                  </button>
                  <button onClick={() => { addSeccion(); setShowAddMenu(false) }}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-white/5">
                    <span className="text-lg">📌</span>
                    <div>
                      <p className="text-white font-semibold text-[14px]">Etapa / Sección</p>
                      <p className="text-gray-500 text-[11px]">Separador para organizar los ítems</p>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* notas colapsables */}
          <button onClick={() => setNotasOpen(v => !v)}
            className="flex items-center justify-between w-full px-4 py-3 rounded-2xl text-left"
            style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
            <span className="text-gray-400 text-[13px]">📝 Notas internas <span className="text-gray-600 text-[11px]">(solo vos las ves)</span></span>
            <ChevronDown size={16} className={`text-gray-500 transition-transform ${notasOpen ? 'rotate-180' : ''}`} />
          </button>
          {notasOpen && (
            <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={3}
              placeholder="Observaciones, acuerdos con el cliente..."
              autoFocus
              className="w-full rounded-2xl px-4 py-3 text-white text-[13px] outline-none resize-none"
              style={{ background: '#161622', border: '1px solid #3B82F6' }} />
          )}

          {editarId ? (
            <button onClick={() => guardar()} disabled={guardando}
              className="w-full py-4 rounded-2xl text-white font-bold text-[15px] disabled:opacity-50"
              style={{ background: '#22C55E' }}>
              {guardando ? 'Guardando...' : '✓ Guardar cambios'}
            </button>
          ) : (
            <>
              <button onClick={() => setStep(3)}
                className="w-full py-4 rounded-2xl text-white font-bold text-[15px]"
                style={{ background: '#3B82F6' }}>
                Ver resumen →
              </button>
              <button onClick={() => guardar('borrador')} disabled={guardando}
                className="w-full py-3 rounded-2xl font-semibold text-[14px] disabled:opacity-50"
                style={{ background: 'transparent', color: '#6B7280', border: '1px solid #2A2A3A' }}>
                {guardando ? 'Guardando...' : '💾 Guardar borrador y salir'}
              </button>
            </>
          )}
        </div>
      )}

      {/* ── PASO 3: Resumen ── */}
      {step === 3 && (
        <div className="px-4 flex flex-col gap-4">
          <p className="text-gray-400 text-[13px]">Revisá antes de guardar</p>

          <div className="rounded-2xl p-5 text-center" style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
            {titulo && <p className="text-blue-400 font-semibold text-[14px] mb-1">{titulo}</p>}
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
              ÍTEMS ({items.filter(i => i.tipo !== 'seccion' && (i.precio_unit > 0 || i.descripcion.trim())).length})
            </p>
            {items.filter(i => i.tipo === 'seccion' || i.precio_unit > 0 || i.descripcion.trim()).map((it, i) => it.tipo === 'seccion' ? (
              <div key={i} className="flex items-center gap-2 my-1">
                <div className="flex-1 h-px" style={{ background: '#2A2A3A' }} />
                <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ color: '#A855F7', background: 'rgba(168,85,247,.1)' }}>
                  📌 {it.descripcion}
                </span>
                <div className="flex-1 h-px" style={{ background: '#2A2A3A' }} />
              </div>
            ) : (
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
