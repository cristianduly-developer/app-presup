import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Eye, MessageCircle, MoreHorizontal, ChevronRight, Download, Play, Plus, X, Trash2, Copy, Send, CheckCircle } from 'lucide-react'
import CircleProgress from '../../components/ui/CircleProgress'
import { supabase } from '../../lib/supabase'
import { usePlan, tieneFeature } from '../../lib/PlanContext'

function fmt(n) { return '$' + Number(n || 0).toLocaleString('es-AR') }

const STATUS_STYLE = {
  enviado:  { label: 'Enviado',  bg: 'rgba(59,130,246,.15)', color: '#3B82F6' },
  aprobado: { label: 'Aprobado', bg: 'rgba(34,197,94,.15)',  color: '#22C55E' },
  borrador: { label: 'Borrador', bg: 'rgba(107,114,128,.2)', color: '#9CA3AF' },
  vencido:  { label: 'Vencido',  bg: 'rgba(239,68,68,.15)',  color: '#EF4444' },
}

export default function DetallePresupuesto() {
  const { id } = useParams()
  const navigate = useNavigate()
  const plan = usePlan()

  const [p, setP] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('todos')
  const [showPago, setShowPago] = useState(false)
  const [montoPago, setMontoPago] = useState('')
  const [guardandoPago, setGuardandoPago] = useState(false)
  const [showMas, setShowMas] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [confirmEliminar, setConfirmEliminar] = useState(false)

  async function abrirPDF() {
    window.open(`${window.location.origin}/presupuestos/${id}/pdf`, '_blank')
    if (p?.status === 'borrador') {
      await supabase.from('presupuestos').update({ status: 'enviado', fecha_envio: new Date().toISOString().split('T')[0] }).eq('id', id)
      cargar()
    }
  }

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

  async function enviarWhatsApp() {
    if (!p?.clientes?.telefono) return
    const d = p.clientes.telefono.replace(/\D/g, '')
    const tel = d.startsWith('54') ? d : d.startsWith('0') ? '54' + d.slice(1) : '54' + d

    // asegurar que exista token_publico
    let token = p.token_publico
    if (!token) {
      const nuevoToken = crypto.randomUUID()
      await supabase.from('presupuestos').update({ token_publico: nuevoToken }).eq('id', id)
      token = nuevoToken
      setP(prev => ({ ...prev, token_publico: nuevoToken }))
    }

    const updates = { status: 'enviado', fecha_envio: new Date().toISOString().split('T')[0] }
    if (p.status === 'borrador') {
      await supabase.from('presupuestos').update(updates).eq('id', id)
      cargar()
    }

    const url = `${window.location.origin}/p/${token}`
    const trabajo = p.titulo ? ` — ${p.titulo}` : ''
    const msg = encodeURIComponent(`Hola ${p.clientes.nombre}, te envío el presupuesto #${p.numero}${trabajo} por ${fmt(p.total)}. Podés verlo acá: ${url}`)
    window.open(`https://wa.me/${tel}?text=${msg}`)
  }

  async function registrarPago() {
    if (!montoPago || isNaN(montoPago)) return
    setGuardandoPago(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('pagos').insert({
      user_id: user.id,
      presupuesto_id: id,
      monto: Number(montoPago),
      metodo: 'efectivo',
      fecha: new Date().toISOString().split('T')[0],
    })
    setMontoPago('')
    setShowPago(false)
    setGuardandoPago(false)
    cargar()
  }

  async function duplicar() {
    setShowMas(false)
    const { data: { user } } = await supabase.auth.getUser()
    const items = (p.presupuesto_items || []).map(({ descripcion, tipo, cantidad, precio_unit, unidad, subtotal, orden }) =>
      ({ descripcion, tipo, cantidad, precio_unit, unidad, subtotal, orden })
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

  async function eliminar() {
    setEliminando(true)
    await supabase.from('presupuesto_items').delete().eq('presupuesto_id', id)
    await supabase.from('presupuestos').delete().eq('id', id)
    navigate('/presupuestos', { replace: true })
  }

  async function cambiarStatus(nuevoStatus) {
    setShowMas(false)
    await supabase.from('presupuestos').update({ status: nuevoStatus }).eq('id', id)
    cargar()
  }

  async function marcarIniciada() {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('presupuestos').update({ status: 'aprobado' }).eq('id', id)
    await supabase.from('obras').insert({
      user_id: user.id,
      presupuesto_id: id,
      cliente_id: p.cliente_id,
      nombre: p.titulo || `${p.clientes?.nombre || 'Cliente'} · Pres. #${p.numero}`,
      total: p.total,
      status: 'en_ejecucion',
      fecha_inicio: new Date().toISOString().split('T')[0],
    })
    cargar()
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

  const cobrado = (p.pagos || []).reduce((s, pg) => s + pg.monto, 0)
  const pct = p.total > 0 ? Math.round((cobrado / p.total) * 100) : 0
  const st = STATUS_STYLE[p.status] || STATUS_STYLE.borrador
  const items = (p.presupuesto_items || []).sort((a, b) => a.orden - b.orden)
  const filtrados = tab === 'todos' ? items : items.filter(i => i.tipo === tab)
  const totalMat = items.filter(i => i.tipo === 'material').reduce((s, i) => s + (i.subtotal || 0), 0)
  const totalMO  = items.filter(i => i.tipo === 'mano_obra').reduce((s, i) => s + (i.subtotal || 0), 0)
  const iniciales = p.clientes?.nombre?.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() || '?'

  return (
    <div className="flex-1 overflow-y-auto pb-32" style={{ background: '#0D0D14' }}>

      {/* header */}
      <div className="flex items-center gap-2 px-4 pt-12 pb-3 sticky top-0 z-10" style={{ background: '#0D0D14' }}>
        <button onClick={() => navigate(-1)} className="text-gray-400 mr-1"><ArrowLeft size={22} /></button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-white font-bold text-[16px] truncate">{p.titulo || `Presupuesto #${p.numero}`}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>{st.label}</span>
            <span className="text-gray-500 text-[11px]">#{p.numero} · {new Date(p.created_at).toLocaleDateString('es-AR')}</span>
          </div>
        </div>
        <button onClick={() => navigate(`/p/${p.token_publico}`)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
          style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
          <Eye size={13} className="text-gray-400" />
          <span className="text-gray-400 text-[11px]">Vista</span>
        </button>
        {tieneFeature(plan, 'pdf') && (
          <button onClick={abrirPDF}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
            style={{ background: 'rgba(168,85,247,.12)', border: '1px solid rgba(168,85,247,.2)' }}>
            <Download size={13} className="text-purple-400" />
            <span className="text-purple-400 text-[11px]">PDF</span>
          </button>
        )}
        <button onClick={enviarWhatsApp}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
          style={{ background: 'rgba(34,197,94,.12)', border: '1px solid rgba(34,197,94,.2)' }}>
          <MessageCircle size={13} className="text-green-400" />
          <span className="text-green-400 text-[11px]">WhatsApp</span>
        </button>
      </div>

      {/* pipeline de etapas */}
      {(() => {
        const ETAPAS = [
          { key: 'borrador',  label: 'Borrador',  color: '#6B7280' },
          { key: 'enviado',   label: 'Enviado',   color: '#3B82F6' },
          { key: 'aprobado',  label: 'Aprobado',  color: '#22C55E' },
          { key: 'en_obra',   label: 'En obra',   color: '#F97316' },
        ]
        const statusActual = p.status === 'rechazado' ? 'rechazado' : p.status
        const idxActual = statusActual === 'en_obra' ? 3
          : ETAPAS.findIndex(e => e.key === statusActual)
        if (statusActual === 'rechazado' || statusActual === 'vencido') return (
          <div className="mx-4 mb-4 rounded-xl px-4 py-2.5 flex items-center gap-2"
            style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)' }}>
            <span className="text-[12px]" style={{ color: '#EF4444' }}>
              {statusActual === 'rechazado' ? '✕ Presupuesto rechazado' : '⏰ Presupuesto vencido'}
            </span>
          </div>
        )
        return (
          <div className="mx-4 mb-4 rounded-2xl px-4 py-3" style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
            <div className="flex items-center">
              {ETAPAS.map((e, i) => {
                const activo = i === idxActual
                const pasado = i < idxActual
                const color = pasado || activo ? e.color : '#2A2A3A'
                return (
                  <div key={e.key} className="flex items-center flex-1">
                    <div className="flex flex-col items-center gap-1 flex-1">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                        style={{ background: pasado || activo ? color + '22' : '#0D0D14', border: `2px solid ${color}` }}>
                        {pasado ? <span style={{ color }}>✓</span> : <span style={{ color: activo ? color : '#4B5563' }}>{i+1}</span>}
                      </div>
                      <span className="text-[9px] font-semibold text-center leading-tight"
                        style={{ color: activo ? color : pasado ? color + 'AA' : '#4B5563' }}>
                        {e.label}
                      </span>
                    </div>
                    {i < ETAPAS.length - 1 && (
                      <div className="h-0.5 flex-1 -mt-4 mx-1"
                        style={{ background: i < idxActual ? ETAPAS[i].color : '#2A2A3A' }} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* cliente */}
      <div className="mx-4 mb-4 rounded-2xl p-4" style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-[17px] shrink-0" style={{ background: '#6D28D9' }}>
            {iniciales}
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold text-[15px]">{p.clientes?.nombre || 'Sin cliente'}</p>
            {p.clientes?.telefono && <p className="text-gray-500 text-[12px]">☎ {p.clientes.telefono}</p>}
            {p.clientes?.direccion && <p className="text-gray-500 text-[12px]">📍 {p.clientes.direccion}</p>}
          </div>
          <div className="text-right shrink-0">
            <p className="text-gray-500 text-[10px]">Vigencia</p>
            <p className="text-white font-bold text-[14px]">{p.vigencia_dias} días</p>
            {p.fecha_vence && <p className="text-gray-500 text-[10px]">vence {new Date(p.fecha_vence).toLocaleDateString('es-AR')}</p>}
          </div>
        </div>
      </div>

      {/* totales */}
      <div className="mx-4 mb-4 rounded-2xl p-4" style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-[11px] mb-1">Total presupuestado</p>
            <p className="text-white font-bold text-[30px] leading-none">{fmt(p.total)}</p>
            <div className="flex gap-4 mt-3">
              <div>
                <p className="text-gray-500 text-[10px]">Materiales</p>
                <p className="font-bold text-[13px]" style={{ color: '#3B82F6' }}>{fmt(totalMat)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-[10px]">Mano de obra</p>
                <p className="font-bold text-[13px]" style={{ color: '#F97316' }}>{fmt(totalMO)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-[10px]">Margen est.</p>
                <p className="font-bold text-[13px]" style={{ color: '#22C55E' }}>
                  {fmt(p.margen_estimado)} <span className="text-[10px]">{p.total > 0 ? Math.round((p.margen_estimado/p.total)*100) : 0}%</span>
                </p>
              </div>
            </div>
          </div>
          <div className="relative shrink-0">
            <CircleProgress pct={pct} size={84} stroke={7} color="#22C55E" />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-white font-bold text-[18px]">{pct}%</span>
              <span className="text-gray-500 text-[9px]">Cobrado</span>
            </div>
          </div>
        </div>
        <p className="text-gray-500 text-[11px] mt-2">{fmt(cobrado)} de {fmt(p.total)}</p>
      </div>

      {/* acciones */}
      <div className="flex gap-2 px-4 mb-4">
        <button onClick={() => setShowPago(true)}
          className="flex-[2] py-3.5 rounded-2xl text-white font-bold text-[13px] flex items-center justify-center gap-2"
          style={{ background: '#22C55E' }}>
          💰 Registrar pago
        </button>
        <button onClick={() => navigate(`/presupuestos/nuevo?editar=${id}`)}
          className="flex-1 py-3.5 rounded-2xl text-white font-semibold text-[12px]"
          style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
          ✎ Editar
        </button>
        <button onClick={() => setShowMas(true)}
          className="w-12 py-3.5 rounded-2xl font-semibold text-[18px] flex items-center justify-center"
          style={{ background: '#161622', border: '1px solid #1E1E2E', color: '#9CA3AF' }}>
          ⋯
        </button>
      </div>

      {/* items */}
      <div className="mx-4 mb-4 rounded-2xl p-4" style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-white font-semibold text-[12px] tracking-wider">DETALLE</span>
          <span className="text-gray-500 text-[11px]">{items.length} ítems</span>
        </div>
        <div className="flex gap-2 mb-4">
          {[['todos', `Todos ${items.length}`], ['material', `Materiales ${items.filter(i=>i.tipo==='material').length}`], ['mano_obra', `Mano de obra ${items.filter(i=>i.tipo==='mano_obra').length}`]].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              className="px-3 py-1.5 rounded-full text-[11px] font-semibold"
              style={{ background: tab === k ? '#3B82F6' : '#0D0D14', color: tab === k ? '#fff' : '#6B7280' }}>
              {l}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-4">
          {filtrados.map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[18px] shrink-0"
                style={{ background: item.tipo === 'material' ? '#1A2A3A' : '#2A1A0A' }}>
                {item.tipo === 'material' ? '🔧' : '👷'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-[13px] leading-tight truncate">{item.descripcion}</p>
                <p className="text-[10px] mt-0.5" style={{ color: item.tipo === 'material' ? '#6B7280' : '#F97316' }}>
                  {item.cantidad} {item.unidad} × {fmt(item.precio_unit)}
                </p>
              </div>
              <p className="text-white font-semibold text-[13px] shrink-0">{fmt(item.subtotal)}</p>
            </div>
          ))}
          {filtrados.length === 0 && <p className="text-gray-600 text-[13px] text-center py-2">Sin ítems</p>}
        </div>
      </div>

      {/* notas */}
      {p.notas_internas && (
        <div className="mx-4 mb-4 rounded-2xl p-4" style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-gray-500">📝</span>
            <span className="text-gray-400 text-[12px]">Notas internas</span>
          </div>
          <p className="text-gray-400 text-[12px]">{p.notas_internas}</p>
        </div>
      )}

      {/* resumen financiero */}
      <div className="grid grid-cols-3 gap-3 px-4 mb-4">
        {[
          { label: 'Cobros recibidos', value: fmt(cobrado), sub: `${p.pagos?.length || 0} pagos`, color: '#22C55E' },
          { label: 'Saldo pendiente',  value: fmt(p.total - cobrado), sub: 'Por cobrar', color: '#F97316' },
          { label: 'Margen estimado',  value: fmt(p.margen_estimado), sub: `${p.total > 0 ? Math.round((p.margen_estimado/p.total)*100) : 0}% del total`, color: '#A855F7' },
        ].map(c => (
          <div key={c.label} className="rounded-2xl p-3" style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
            <p className="text-gray-500 text-[9px] leading-tight mb-1">{c.label}</p>
            <p className="font-bold text-[13px]" style={{ color: c.color }}>{c.value}</p>
            <p className="text-gray-600 text-[9px] mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* footer */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-4 flex gap-2 pb-2"
        style={{ background: 'linear-gradient(to top, #0D0D14 70%, transparent)' }}>
        {p.status === 'enviado' && (
          <button onClick={marcarIniciada}
            className="flex-1 py-3.5 rounded-2xl text-[12px] font-semibold flex items-center justify-center gap-2"
            style={{ background: '#161622', border: '1px solid rgba(34,197,94,.3)', color: '#22C55E' }}>
            <Play size={13} /> Marcar iniciada
          </button>
        )}
        <button onClick={abrirPDF}
          className="flex-1 py-3.5 rounded-2xl text-[12px] font-semibold text-white flex items-center justify-center gap-2"
          style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
          <Download size={13} /> PDF
        </button>
        <button onClick={enviarWhatsApp}
          className="flex-[1.5] py-3.5 rounded-2xl text-[12px] font-bold text-white flex items-center justify-center gap-2"
          style={{ background: '#22C55E' }}>
          <MessageCircle size={13} /> WhatsApp
        </button>
      </div>

      {/* bottom sheet "Más" */}
      {showMas && (
        <div className="fixed inset-0 z-[60] flex items-end" onClick={() => setShowMas(false)}>
          <div className="w-full max-w-[430px] mx-auto rounded-t-3xl p-5"
            style={{ background: '#161622', border: '1px solid #1E1E2E' }}
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: '#2A2A3A' }} />
            <p className="text-gray-400 text-[11px] font-semibold mb-3 px-1">Presupuesto #{p.numero}</p>
            <div className="flex flex-col gap-1">
              <button onClick={duplicar}
                className="flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl text-left"
                style={{ background: '#0D0D14' }}>
                <Copy size={16} className="text-blue-400" />
                <span className="text-white font-medium text-[14px]">Duplicar presupuesto</span>
              </button>
              {p.status === 'borrador' && (
                <button onClick={() => cambiarStatus('enviado')}
                  className="flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl text-left"
                  style={{ background: '#0D0D14' }}>
                  <Send size={16} className="text-green-400" />
                  <span className="text-white font-medium text-[14px]">Marcar como enviado</span>
                </button>
              )}
              {p.status === 'enviado' && (
                <button onClick={() => cambiarStatus('aprobado')}
                  className="flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl text-left"
                  style={{ background: '#0D0D14' }}>
                  <CheckCircle size={16} className="text-green-400" />
                  <span className="text-white font-medium text-[14px]">Marcar como aprobado</span>
                </button>
              )}
              <button onClick={() => { setShowMas(false); setConfirmEliminar(true) }}
                className="flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl text-left mt-1"
                style={{ background: 'rgba(239,68,68,.08)' }}>
                <Trash2 size={16} className="text-red-400" />
                <span className="font-medium text-[14px]" style={{ color: '#EF4444' }}>Eliminar presupuesto</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* confirm eliminar */}
      {confirmEliminar && (
        <div className="fixed inset-0 z-[70] flex items-end" onClick={() => setConfirmEliminar(false)}>
          <div className="w-full max-w-[430px] mx-auto rounded-t-3xl p-6"
            style={{ background: '#161622', border: '1px solid #1E1E2E' }}
            onClick={e => e.stopPropagation()}>
            <p className="text-white font-bold text-[17px] mb-2">¿Eliminar presupuesto?</p>
            <p className="text-gray-400 text-[13px] mb-6">Esta acción no se puede deshacer. Se eliminarán todos los ítems.</p>
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

      {/* modal registrar pago */}
      {showPago && (
        <div className="fixed inset-0 z-[60] flex items-end" onClick={() => setShowPago(false)}>
          <div className="w-full max-w-[430px] mx-auto rounded-t-3xl p-6"
            style={{ background: '#161622', border: '1px solid #1E1E2E' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-white font-bold text-[17px]">Registrar pago</p>
              <button onClick={() => setShowPago(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <p className="text-gray-500 text-[12px] mb-3">Saldo pendiente: {fmt(p.total - cobrado)}</p>
            <input
              type="number" placeholder="Monto recibido" value={montoPago}
              onChange={e => setMontoPago(e.target.value)}
              className="w-full rounded-2xl px-4 py-4 text-white text-[18px] font-bold outline-none mb-4"
              style={{ background: '#0D0D14', border: '1px solid #2A2A3A' }}
              autoFocus
            />
            <button onClick={registrarPago} disabled={guardandoPago || !montoPago}
              className="w-full py-4 rounded-2xl text-white font-bold text-[15px] disabled:opacity-50"
              style={{ background: '#22C55E' }}>
              {guardandoPago ? 'Guardando...' : `Registrar ${montoPago ? fmt(Number(montoPago)) : ''}`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
