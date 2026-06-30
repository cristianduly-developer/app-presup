import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, MessageCircle, Download, Pencil, Trash2, Copy, BookmarkPlus, Play, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { usePlan, tieneFeature } from '../../lib/PlanContext'
import { fmt } from '../../lib/fmt'

const STATUS_STYLE = {
  enviado:  { label: 'Enviado',  bg: 'rgba(59,130,246,.18)',  color: '#3B82F6' },
  aprobado: { label: 'Aprobado', bg: 'rgba(34,197,94,.18)',   color: '#22C55E' },
  borrador: { label: 'Borrador', bg: 'rgba(107,114,128,.22)', color: '#9CA3AF' },
  vencido:  { label: 'Vencido',  bg: 'rgba(239,68,68,.18)',   color: '#EF4444' },
  rechazado:{ label: 'Rechazado',bg: 'rgba(239,68,68,.18)',   color: '#EF4444' },
  en_obra:  { label: 'En obra',  bg: 'rgba(249,115,22,.18)',  color: '#F97316' },
}

export default function DetallePresupuesto() {
  const { id } = useParams()
  const navigate = useNavigate()
  const plan = usePlan()

  const [p, setP] = useState(null)
  const [loading, setLoading] = useState(true)
  const [eliminando, setEliminando] = useState(false)
  const [confirmEliminar, setConfirmEliminar] = useState(false)
  const [iniciando, setIniciando] = useState(false)
  const [guardandoPlantilla, setGuardandoPlantilla] = useState(false)
  const [toastMsg, setToastMsg] = useState('')

  useEffect(() => { cargar() }, [id])

  async function cargar() {
    setLoading(true)
    const { data } = await supabase
      .from('presupuestos')
      .select(`*, clientes(*), presupuesto_items(*), pagos(*)`)
      .eq('id', id)
      .single()
    setP(data)
    setLoading(false)
  }

  function toast(msg) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 3000)
  }

  async function abrirPDF() {
    window.open(`${window.location.origin}/presupuestos/${id}/pdf`, '_blank')
    if (p?.status === 'borrador') {
      await supabase.from('presupuestos').update({ status: 'enviado', fecha_envio: new Date().toISOString().split('T')[0] }).eq('id', id)
      cargar()
    }
  }

  async function enviarWhatsApp() {
    if (!p?.clientes?.telefono) return
    const d = p.clientes.telefono.replace(/\D/g, '')
    const tel = d.startsWith('54') ? d : d.startsWith('0') ? '54' + d.slice(1) : '54' + d

    let token = p.token_publico
    if (!token) {
      const nuevoToken = crypto.randomUUID()
      await supabase.from('presupuestos').update({ token_publico: nuevoToken }).eq('id', id)
      token = nuevoToken
      setP(prev => ({ ...prev, token_publico: nuevoToken }))
    }

    if (p.status === 'borrador') {
      await supabase.from('presupuestos').update({ status: 'enviado', fecha_envio: new Date().toISOString().split('T')[0] }).eq('id', id)
      cargar()
    }

    const url = `${window.location.origin}/p/${token}`
    const trabajo = p.titulo ? ` — ${p.titulo}` : ''
    const msg = encodeURIComponent(`Hola ${p.clientes.nombre}, te envío el presupuesto #${p.numero}${trabajo} por ${fmt(p.total)}. Podés verlo acá: ${url}`)
    window.open(`https://wa.me/${tel}?text=${msg}`)
  }

  async function duplicar() {
    const { data: { user } } = await supabase.auth.getUser()
    const items = (p.presupuesto_items || []).map(({ descripcion, tipo, cantidad, precio_unit, unidad, orden }) =>
      ({ descripcion, tipo, cantidad, precio_unit, unidad, orden })
    )
    const { data: nuevo, error } = await supabase.rpc('crear_presupuesto', {
      p_user_id:          user.id,
      p_cliente_id:       p.cliente_id,
      p_vigencia_dias:    p.vigencia_dias,
      p_notas_internas:   p.notas_internas || '',
      p_status:           'borrador',
      p_total:            p.total,
      p_total_materiales: p.total_materiales,
      p_total_mano_obra:  p.total_mano_obra,
      p_margen_estimado:  p.margen_estimado,
      p_fecha_vence:      null,
      p_items:            items,
    })
    if (!error && nuevo) navigate(`/presupuestos/${nuevo.id}`)
  }

  async function guardarPlantilla() {
    if (!tieneFeature(plan, 'plantillas')) { toast('Función disponible en plan Profesional o superior'); return }
    setGuardandoPlantilla(true)
    const { data: { user } } = await supabase.auth.getUser()
    const items = (p.presupuesto_items || []).map(({ descripcion, tipo, cantidad, precio_unit, unidad, orden }) =>
      ({ descripcion, tipo, cantidad, precio_unit, unidad, orden })
    )
    const { error } = await supabase.from('plantillas').insert({
      user_id: user.id,
      nombre: p.titulo || `Plantilla #${p.numero}`,
      items,
      total_estimado: p.total,
    })
    setGuardandoPlantilla(false)
    toast(error ? 'No se pudo guardar' : 'Guardado como plantilla ✓')
  }

  async function eliminar() {
    setEliminando(true)
    await supabase.from('presupuesto_items').delete().eq('presupuesto_id', id)
    await supabase.from('presupuestos').delete().eq('id', id)
    navigate('/presupuestos', { replace: true })
  }

  async function iniciarObra() {
    setIniciando(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('presupuestos').update({ status: 'en_obra' }).eq('id', id)
    await supabase.from('obras').insert({
      user_id: user.id,
      presupuesto_id: id,
      cliente_id: p.cliente_id,
      nombre: p.titulo || `${p.clientes?.nombre || 'Cliente'} · Pres. #${p.numero}`,
      total: p.total,
      status: 'en_ejecucion',
      fecha_inicio: new Date().toISOString().split('T')[0],
    })
    setIniciando(false)
    navigate('/obras')
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center" style={{ background: '#0D0D14' }}>
      <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(59,130,246,.3)', borderTopColor: '#3B82F6' }} />
    </div>
  )

  if (!p) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3" style={{ background: '#0D0D14' }}>
      <span className="text-4xl">😕</span>
      <p className="text-white font-semibold">Presupuesto no encontrado</p>
      <button onClick={() => navigate(-1)} className="text-blue-400 text-sm">Volver</button>
    </div>
  )

  const cobrado = 0
  const pendiente = p.total
  const st = STATUS_STYLE[p.status] || STATUS_STYLE.borrador
  const items = (p.presupuesto_items || []).sort((a, b) => a.orden - b.orden)
  const totalMat = items.filter(i => i.tipo === 'material').reduce((s, i) => s + (i.subtotal || 0), 0)
  const totalMO  = items.filter(i => i.tipo === 'mano_obra').reduce((s, i) => s + (i.subtotal || 0), 0)
  const iniciales = p.clientes?.nombre?.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() || '?'

  const fechaCreado = new Date(p.created_at).toLocaleDateString('es-AR')
  const fechaVence  = p.fecha_vence ? new Date(p.fecha_vence + 'T00:00:00').toLocaleDateString('es-AR') : null
  const fechaEnvio  = p.fecha_envio ? new Date(p.fecha_envio + 'T00:00:00').toLocaleDateString('es-AR') : null

  return (
    <div className="flex-1 overflow-y-auto pb-8" style={{ background: '#0D0D14' }}>

      {/* header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4 sticky top-0 z-10" style={{ background: '#0D0D14' }}>
        <button onClick={() => navigate(-1)} className="text-gray-400"><ArrowLeft size={22} /></button>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-[17px] truncate">{p.titulo || `Presupuesto #${p.numero}`}</p>
          <p className="text-gray-500 text-[11px]">#{p.numero}</p>
        </div>
        <span className="text-[12px] font-bold px-3 py-1.5 rounded-full" style={{ background: st.bg, color: st.color }}>
          {st.label}
        </span>
      </div>

      <div className="flex flex-col gap-3 px-4">

        {/* cliente */}
        <div className="rounded-2xl p-4" style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
          <p className="text-gray-500 text-[10px] font-semibold tracking-wider mb-3">CLIENTE</p>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-[15px] shrink-0" style={{ background: '#6D28D9' }}>
              {iniciales}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-[15px]">{p.clientes?.nombre || 'Sin cliente'}</p>
              {p.clientes?.telefono  && <p className="text-gray-500 text-[12px]">☎ {p.clientes.telefono}</p>}
              {p.clientes?.direccion && <p className="text-gray-500 text-[12px] truncate">📍 {p.clientes.direccion}</p>}
            </div>
          </div>
        </div>

        {/* fechas */}
        <div className="rounded-2xl p-4" style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
          <p className="text-gray-500 text-[10px] font-semibold tracking-wider mb-3">FECHAS</p>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between">
              <span className="text-gray-500 text-[13px]">Creado</span>
              <span className="text-white text-[13px] font-medium">{fechaCreado}</span>
            </div>
            {fechaEnvio && (
              <div className="flex justify-between">
                <span className="text-gray-500 text-[13px]">Enviado</span>
                <span className="text-[13px] font-medium" style={{ color: '#3B82F6' }}>{fechaEnvio}</span>
              </div>
            )}
            {fechaVence && (
              <div className="flex justify-between">
                <span className="text-gray-500 text-[13px]">Vence</span>
                <span className="text-[13px] font-medium" style={{ color: '#F97316' }}>{fechaVence} ({p.vigencia_dias}d)</span>
              </div>
            )}
          </div>
        </div>

        {/* costos */}
        <div className="rounded-2xl p-4" style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
          <p className="text-gray-500 text-[10px] font-semibold tracking-wider mb-3">COSTOS</p>
          <div className="flex flex-col gap-2">
            {totalMat > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500 text-[13px]">Materiales</span>
                <span className="text-[13px] font-medium" style={{ color: '#3B82F6' }}>{fmt(totalMat)}</span>
              </div>
            )}
            {totalMO > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500 text-[13px]">Mano de obra</span>
                <span className="text-[13px] font-medium" style={{ color: '#F97316' }}>{fmt(totalMO)}</span>
              </div>
            )}
            <div className="h-px my-1" style={{ background: '#1E1E2E' }} />
            <div className="flex justify-between items-center">
              <span className="text-white font-bold text-[14px]">Total</span>
              <span className="text-white font-bold text-[20px]">{fmt(p.total)}</span>
            </div>
            {cobrado > 0 && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-500 text-[13px]">Cobrado</span>
                  <span className="text-[13px] font-medium" style={{ color: '#22C55E' }}>{fmt(cobrado)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 text-[13px]">Pendiente</span>
                  <span className="text-[13px] font-medium" style={{ color: '#EF4444' }}>{fmt(pendiente)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* items */}
        {items.length > 0 && (
          <div className="rounded-2xl p-4" style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
            <p className="text-gray-500 text-[10px] font-semibold tracking-wider mb-3">ÍTEMS ({items.length})</p>
            <div className="flex flex-col gap-3">
              {items.map((item, i) => (
                item.tipo === 'seccion' ? (
                  <p key={i} className="text-gray-400 text-[11px] font-semibold uppercase tracking-wider mt-1">
                    {item.descripcion || 'Etapa'}
                  </p>
                ) : (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[14px] shrink-0"
                      style={{ background: item.tipo === 'material' ? '#1A2A3A' : '#2A1A0A' }}>
                      {item.tipo === 'material' ? '🔧' : '👷'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-[13px] leading-tight">{item.descripcion || (item.tipo === 'mano_obra' ? 'Mano de obra' : 'Material')}</p>
                      <p className="text-gray-600 text-[11px]">{item.cantidad} {item.unidad} × {fmt(item.precio_unit)}</p>
                    </div>
                    <p className="text-white font-semibold text-[13px] shrink-0">{fmt(item.subtotal)}</p>
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        {/* notas */}
        {p.notas_internas && (
          <div className="rounded-2xl p-4" style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
            <p className="text-gray-500 text-[10px] font-semibold tracking-wider mb-2">NOTAS INTERNAS</p>
            <p className="text-gray-400 text-[13px]">{p.notas_internas}</p>
          </div>
        )}

        {/* acciones */}
        <div className="rounded-2xl p-4" style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
          <p className="text-gray-500 text-[10px] font-semibold tracking-wider mb-3">ACCIONES</p>
          <div className="flex flex-col gap-2">

            {/* iniciar obra - solo si aprobado */}
            {p.status === 'aprobado' && (
              <button onClick={iniciarObra} disabled={iniciando}
                className="w-full py-3.5 rounded-2xl text-white font-bold text-[14px] flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: '#F97316' }}>
                <Play size={16} /> {iniciando ? 'Iniciando...' : 'Iniciar obra'}
              </button>
            )}

            {/* grid 2 columnas */}
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button onClick={enviarWhatsApp}
                className="py-3 rounded-2xl text-[13px] font-semibold flex items-center justify-center gap-2"
                style={{ background: 'rgba(34,197,94,.12)', color: '#22C55E' }}>
                <MessageCircle size={15} /> Enviar
              </button>

              {tieneFeature(plan, 'pdf') ? (
                <button onClick={abrirPDF}
                  className="py-3 rounded-2xl text-[13px] font-semibold flex items-center justify-center gap-2"
                  style={{ background: 'rgba(168,85,247,.12)', color: '#A855F7' }}>
                  <Download size={15} /> PDF
                </button>
              ) : (
                <button disabled
                  className="py-3 rounded-2xl text-[13px] font-semibold flex items-center justify-center gap-2 opacity-40"
                  style={{ background: '#0D0D14', color: '#6B7280' }}>
                  <Download size={15} /> PDF
                </button>
              )}

              <button onClick={() => navigate(`/presupuestos/nuevo?editar=${id}`)}
                className="py-3 rounded-2xl text-[13px] font-semibold flex items-center justify-center gap-2"
                style={{ background: 'rgba(59,130,246,.12)', color: '#3B82F6' }}>
                <Pencil size={15} /> Editar
              </button>

              <button onClick={duplicar}
                className="py-3 rounded-2xl text-[13px] font-semibold flex items-center justify-center gap-2"
                style={{ background: 'rgba(107,114,128,.1)', color: '#9CA3AF' }}>
                <Copy size={15} /> Duplicar
              </button>

              <button onClick={guardarPlantilla} disabled={guardandoPlantilla}
                className="py-3 rounded-2xl text-[13px] font-semibold flex items-center justify-center gap-2 disabled:opacity-60 col-span-2"
                style={{ background: 'rgba(251,191,36,.1)', color: '#FBB724' }}>
                <BookmarkPlus size={15} /> {guardandoPlantilla ? 'Guardando...' : 'Guardar como plantilla'}
              </button>
            </div>

            {/* eliminar al fondo */}
            <button onClick={() => setConfirmEliminar(true)}
              className="w-full py-3 rounded-2xl text-[13px] font-semibold flex items-center justify-center gap-2 mt-1"
              style={{ background: 'rgba(239,68,68,.08)', color: '#EF4444' }}>
              <Trash2 size={15} /> Eliminar presupuesto
            </button>
          </div>
        </div>

      </div>

      {/* toast */}
      {toastMsg && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[80] px-5 py-3 rounded-2xl text-white text-[13px] font-semibold"
          style={{ background: '#22C55E' }}>
          {toastMsg}
        </div>
      )}

      {/* confirm eliminar */}
      {confirmEliminar && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-6" style={{ background: 'rgba(0,0,0,.6)' }}>
          <div className="w-full max-w-[340px] rounded-3xl p-6" style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(239,68,68,.12)' }}>
              <Trash2 size={22} style={{ color: '#EF4444' }} />
            </div>
            <p className="text-white font-bold text-[16px] text-center mb-1">¿Eliminar presupuesto?</p>
            <p className="text-gray-400 text-[13px] text-center mb-6">Esta acción no se puede deshacer. Se eliminarán todos los ítems.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmEliminar(false)}
                className="flex-1 py-3.5 rounded-2xl text-gray-400 font-semibold text-[14px]"
                style={{ background: '#0D0D14', border: '1px solid #2A2A3A' }}>
                Cancelar
              </button>
              <button onClick={eliminar} disabled={eliminando}
                className="flex-1 py-3.5 rounded-2xl font-bold text-[14px] text-white disabled:opacity-50"
                style={{ background: '#EF4444' }}>
                {eliminando ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
