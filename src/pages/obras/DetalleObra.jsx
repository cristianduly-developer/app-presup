import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, X, Camera, RefreshCw } from 'lucide-react'
import CircleProgress from '../../components/ui/CircleProgress'
import { supabase } from '../../lib/supabase'

function fmt(n) { return '$' + Number(n || 0).toLocaleString('es-AR') }

const TABS = ['Resumen', 'Pagos', 'Gastos', 'Horas', 'Fotos', 'Notas']

export default function DetalleObra() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [obra, setObra] = useState(null)
  const [pagos, setPagos] = useState([])
  const [gastos, setGastos] = useState([])
  const [horas, setHoras] = useState([])
  const [fotos, setFotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('Resumen')

  // modales
  const [modal, setModal] = useState(null) // 'pago' | 'gasto' | 'horas'
  const [form, setForm] = useState({})
  const [guardando, setGuardando] = useState(false)

  useEffect(() => { cargar() }, [id])

  async function cargar() {
    setLoading(true)
    const [{ data: o }, { data: p }, { data: g }, { data: h }, { data: f }] = await Promise.all([
      supabase.from('obras').select('*, clientes(nombre, telefono)').eq('id', id).single(),
      supabase.from('pagos').select('*').eq('obra_id', id).order('fecha', { ascending: false }),
      supabase.from('gastos').select('*').eq('obra_id', id).order('fecha', { ascending: false }),
      supabase.from('horas').select('*').eq('obra_id', id).order('fecha', { ascending: false }),
      supabase.from('fotos').select('*').eq('obra_id', id).order('created_at', { ascending: false }),
    ])
    setObra(o); setPagos(p||[]); setGastos(g||[]); setHoras(h||[]); setFotos(f||[])
    setLoading(false)
  }

  async function guardarModal() {
    setGuardando(true)
    const { data: { user } } = await supabase.auth.getUser()
    const hoy = new Date().toISOString().split('T')[0]
    if (modal === 'pago') {
      await supabase.from('pagos').insert({ user_id: user.id, obra_id: id, monto: Number(form.monto), metodo: form.metodo || 'efectivo', fecha: form.fecha || hoy, notas: form.notas || '' })
    } else if (modal === 'gasto') {
      await supabase.from('gastos').insert({ user_id: user.id, obra_id: id, descripcion: form.descripcion, monto: Number(form.monto), categoria: form.categoria || 'material', fecha: form.fecha || hoy })
    } else if (modal === 'horas') {
      await supabase.from('horas').insert({ user_id: user.id, obra_id: id, cantidad: Number(form.cantidad), descripcion: form.descripcion || '', fecha: form.fecha || hoy })
    }
    setModal(null); setForm({})
    setGuardando(false)
    cargar()
  }

  async function subirFoto(e) {
    const file = e.target.files[0]
    if (!file) return
    const { data: { user } } = await supabase.auth.getUser()
    const path = `${user.id}/${id}/${Date.now()}_${file.name}`
    const { data: upload } = await supabase.storage.from('fotos-obras').upload(path, file)
    if (upload) {
      const { data: { publicUrl } } = supabase.storage.from('fotos-obras').getPublicUrl(path)
      await supabase.from('fotos').insert({ user_id: user.id, obra_id: id, url: publicUrl, etapa: 'durante' })
      cargar()
    }
  }

  async function cambiarStatus(status) {
    await supabase.from('obras').update({ status }).eq('id', id)
    cargar()
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center" style={{ background: '#0D0D14' }}>
      <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(59,130,246,.3)', borderTopColor: '#3B82F6' }} />
    </div>
  )
  if (!obra) return null

  const cobrado   = pagos.reduce((s, p) => s + p.monto, 0)
  const gastoTotal= gastos.reduce((s, g) => s + g.monto, 0)
  const horasTotal= horas.reduce((s, h) => s + h.cantidad, 0)
  const pendiente = (obra.total || 0) - cobrado
  const ganancia  = (obra.total || 0) - gastoTotal
  const valorHora = horasTotal > 0 ? Math.round(ganancia / horasTotal) : 0
  const pct       = obra.total > 0 ? Math.round((cobrado / obra.total) * 100) : 0

  const STATUS_NEXT = {
    presupuestada:   { label: '▶ Iniciar obra',       next: 'en_ejecucion' },
    en_ejecucion:    { label: '✓ Finalizar obra',     next: 'pendiente_cobro' },
    pendiente_cobro: { label: '💰 Marcar como cobrada', next: 'cobrada' },
  }

  return (
    <div className="flex-1 overflow-y-auto pb-28" style={{ background: '#0D0D14' }}>

      {/* header */}
      <div className="flex items-center gap-2 px-4 pt-12 pb-3 sticky top-0 z-10" style={{ background: '#0D0D14' }}>
        <button onClick={() => navigate(-1)} className="text-gray-400"><ArrowLeft size={22} /></button>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-[16px] leading-tight truncate">{obra.nombre}</p>
          {obra.clientes?.nombre && <p className="text-gray-500 text-[12px]">{obra.clientes.nombre}</p>}
        </div>
        <button onClick={cargar} className="text-gray-500"><RefreshCw size={16} /></button>
      </div>

      {/* resumen financiero top */}
      <div className="mx-4 mb-4 rounded-2xl p-4" style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <CircleProgress pct={pct} size={80} stroke={6} color="#F97316" />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-white font-bold text-[16px]">{pct}%</span>
              <span className="text-gray-500 text-[9px]">Cobrado</span>
            </div>
          </div>
          <div className="flex-1">
            <div className="flex gap-3">
              <div>
                <p className="text-gray-500 text-[9px]">Total</p>
                <p className="text-white font-bold text-[14px]">{fmt(obra.total)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-[9px]">Cobrado</p>
                <p className="font-bold text-[14px]" style={{ color: '#22C55E' }}>{fmt(cobrado)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-[9px]">Saldo</p>
                <p className="font-bold text-[14px]" style={{ color: '#F97316' }}>{fmt(pendiente)}</p>
              </div>
            </div>
            <div className="flex gap-3 mt-2 pt-2" style={{ borderTop: '1px solid #1E1E2E' }}>
              <div>
                <p className="text-gray-500 text-[9px]">Gastos</p>
                <p className="font-bold text-[13px]" style={{ color: '#EF4444' }}>{fmt(gastoTotal)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-[9px]">Ganancia</p>
                <p className="font-bold text-[13px]" style={{ color: '#A855F7' }}>{fmt(ganancia)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-[9px]">Horas</p>
                <p className="font-bold text-[13px]" style={{ color: '#3B82F6' }}>{horasTotal}h</p>
              </div>
              <div>
                <p className="text-gray-500 text-[9px]">Valor hora</p>
                <p className="font-bold text-[13px]" style={{ color: '#14B8A6' }}>{fmt(valorHora)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* tabs */}
      <div className="flex gap-2 px-4 mb-4 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-1.5 rounded-full text-[12px] font-medium shrink-0"
            style={{ background: tab === t ? '#3B82F6' : '#161622', color: tab === t ? '#fff' : '#6B7280', border: tab === t ? 'none' : '1px solid #1E1E2E' }}>
            {t}
          </button>
        ))}
      </div>

      {/* ── PAGOS ── */}
      {tab === 'Pagos' && (
        <div className="px-4 flex flex-col gap-3">
          <button onClick={() => { setModal('pago'); setForm({}) }}
            className="flex items-center justify-center gap-2 py-3 rounded-2xl text-[13px] font-semibold"
            style={{ background: 'rgba(34,197,94,.12)', color: '#22C55E', border: '1px dashed rgba(34,197,94,.3)' }}>
            <Plus size={16} /> Registrar pago
          </button>
          {pagos.map((p, i) => (
            <div key={i} className="flex items-center justify-between rounded-2xl px-4 py-3"
              style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
              <div>
                <p className="text-white font-semibold text-[14px]">{fmt(p.monto)}</p>
                <p className="text-gray-500 text-[11px]">{new Date(p.fecha).toLocaleDateString('es-AR')} · {p.metodo}</p>
                {p.notas && <p className="text-gray-600 text-[10px]">{p.notas}</p>}
              </div>
              <span className="text-green-400 text-[11px] font-semibold px-2 py-1 rounded-full" style={{ background: 'rgba(34,197,94,.12)' }}>Recibido</span>
            </div>
          ))}
          {pagos.length === 0 && <p className="text-gray-600 text-[13px] text-center py-6">Sin pagos registrados</p>}
        </div>
      )}

      {/* ── GASTOS ── */}
      {tab === 'Gastos' && (
        <div className="px-4 flex flex-col gap-3">
          <button onClick={() => { setModal('gasto'); setForm({}) }}
            className="flex items-center justify-center gap-2 py-3 rounded-2xl text-[13px] font-semibold"
            style={{ background: 'rgba(249,115,22,.12)', color: '#F97316', border: '1px dashed rgba(249,115,22,.3)' }}>
            <Plus size={16} /> Registrar gasto
          </button>
          {gastos.map((g, i) => (
            <div key={i} className="flex items-center justify-between rounded-2xl px-4 py-3"
              style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
              <div>
                <p className="text-white text-[14px]">{g.descripcion}</p>
                <p className="text-gray-500 text-[11px]">{new Date(g.fecha).toLocaleDateString('es-AR')} · {g.categoria}</p>
              </div>
              <p className="font-bold text-[14px]" style={{ color: '#EF4444' }}>{fmt(g.monto)}</p>
            </div>
          ))}
          {gastos.length === 0 && <p className="text-gray-600 text-[13px] text-center py-6">Sin gastos registrados</p>}
        </div>
      )}

      {/* ── HORAS ── */}
      {tab === 'Horas' && (
        <div className="px-4 flex flex-col gap-3">
          <div className="rounded-2xl p-4 text-center mb-2" style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
            <p className="text-gray-500 text-[11px]">Total horas trabajadas</p>
            <p className="text-white font-bold text-[32px]">{horasTotal}h</p>
            <p className="text-gray-500 text-[12px]">Valor hora real: <span style={{ color: '#14B8A6' }}>{fmt(valorHora)}</span></p>
          </div>
          <button onClick={() => { setModal('horas'); setForm({}) }}
            className="flex items-center justify-center gap-2 py-3 rounded-2xl text-[13px] font-semibold"
            style={{ background: 'rgba(59,130,246,.12)', color: '#3B82F6', border: '1px dashed rgba(59,130,246,.3)' }}>
            <Plus size={16} /> Registrar horas
          </button>
          {horas.map((h, i) => (
            <div key={i} className="flex items-center justify-between rounded-2xl px-4 py-3"
              style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
              <div>
                <p className="text-white text-[14px]">{h.descripcion || 'Horas de trabajo'}</p>
                <p className="text-gray-500 text-[11px]">{new Date(h.fecha).toLocaleDateString('es-AR')}</p>
              </div>
              <p className="font-bold text-[16px]" style={{ color: '#3B82F6' }}>{h.cantidad}h</p>
            </div>
          ))}
        </div>
      )}

      {/* ── FOTOS ── */}
      {tab === 'Fotos' && (
        <div className="px-4">
          <label className="flex items-center justify-center gap-2 py-3 rounded-2xl text-[13px] font-semibold mb-3 cursor-pointer"
            style={{ background: 'rgba(168,85,247,.12)', color: '#A855F7', border: '1px dashed rgba(168,85,247,.3)' }}>
            <Camera size={16} /> Subir foto
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={subirFoto} />
          </label>
          {fotos.length === 0
            ? <p className="text-gray-600 text-[13px] text-center py-6">Sin fotos cargadas</p>
            : <div className="grid grid-cols-3 gap-2">
                {fotos.map((f, i) => (
                  <img key={i} src={f.url} alt="" className="w-full aspect-square object-cover rounded-xl" />
                ))}
              </div>
          }
        </div>
      )}

      {/* ── NOTAS ── */}
      {tab === 'Notas' && (
        <div className="px-4">
          <textarea
            defaultValue={obra.notas || ''}
            onBlur={async e => {
              await supabase.from('obras').update({ notas: e.target.value }).eq('id', id)
            }}
            rows={8}
            placeholder="Anotá observaciones, acuerdos con el cliente, pendientes..."
            className="w-full rounded-2xl px-4 py-3 text-white text-[13px] outline-none resize-none"
            style={{ background: '#161622', border: '1px solid #1E1E2E' }}
          />
          <p className="text-gray-600 text-[11px] mt-2 text-center">Se guarda automáticamente</p>
        </div>
      )}

      {/* ── RESUMEN ── */}
      {tab === 'Resumen' && (
        <div className="px-4 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { l: 'Ganancia neta',  v: fmt(ganancia),   c: '#A855F7' },
              { l: 'Valor hora real', v: fmt(valorHora), c: '#14B8A6' },
              { l: 'Total gastos',   v: fmt(gastoTotal), c: '#EF4444' },
              { l: 'Horas totales',  v: `${horasTotal}h`, c: '#3B82F6' },
            ].map(k => (
              <div key={k.l} className="rounded-2xl p-4" style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
                <p className="text-gray-500 text-[10px] mb-1">{k.l}</p>
                <p className="font-bold text-[20px]" style={{ color: k.c }}>{k.v}</p>
              </div>
            ))}
          </div>
          {obra.notas && (
            <div className="rounded-2xl p-4" style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
              <p className="text-gray-500 text-[11px] mb-1">Notas</p>
              <p className="text-white text-[13px]">{obra.notas}</p>
            </div>
          )}
        </div>
      )}

      {/* botón cambiar estado */}
      {STATUS_NEXT[obra.status] && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-4 pb-2"
          style={{ background: 'linear-gradient(to top, #0D0D14 70%, transparent)' }}>
          <button onClick={() => cambiarStatus(STATUS_NEXT[obra.status].next)}
            className="w-full py-4 rounded-2xl text-white font-bold text-[15px]"
            style={{ background: '#3B82F6' }}>
            {STATUS_NEXT[obra.status].label}
          </button>
        </div>
      )}

      {/* modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setModal(null)}>
          <div className="w-full max-w-[430px] mx-auto rounded-t-3xl p-6"
            style={{ background: '#161622', border: '1px solid #1E1E2E' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-white font-bold text-[17px]">
                {modal === 'pago' ? 'Registrar pago' : modal === 'gasto' ? 'Registrar gasto' : 'Registrar horas'}
              </p>
              <button onClick={() => setModal(null)}><X size={20} className="text-gray-400" /></button>
            </div>

            <div className="flex flex-col gap-3">
              {modal === 'pago' && <>
                <Campo label="Monto" type="number" value={form.monto} onChange={v => setForm(f => ({...f, monto: v}))} placeholder="0" />
                <SelectCampo label="Método" value={form.metodo || 'efectivo'} onChange={v => setForm(f => ({...f, metodo: v}))}
                  opts={[['efectivo','Efectivo'],['transferencia','Transferencia'],['mercadopago','Mercado Pago']]} />
                <Campo label="Notas" value={form.notas} onChange={v => setForm(f => ({...f, notas: v}))} placeholder="Opcional" />
              </>}
              {modal === 'gasto' && <>
                <Campo label="Descripción" value={form.descripcion} onChange={v => setForm(f => ({...f, descripcion: v}))} placeholder="Ej: Caños PVC" />
                <Campo label="Monto" type="number" value={form.monto} onChange={v => setForm(f => ({...f, monto: v}))} placeholder="0" />
                <SelectCampo label="Categoría" value={form.categoria || 'material'} onChange={v => setForm(f => ({...f, categoria: v}))}
                  opts={[['material','Material'],['herramienta','Herramienta'],['traslado','Traslado'],['otro','Otro']]} />
              </>}
              {modal === 'horas' && <>
                <Campo label="Horas trabajadas" type="number" value={form.cantidad} onChange={v => setForm(f => ({...f, cantidad: v}))} placeholder="0" />
                <Campo label="Descripción" value={form.descripcion} onChange={v => setForm(f => ({...f, descripcion: v}))} placeholder="Opcional" />
              </>}
            </div>

            <button onClick={guardarModal} disabled={guardando}
              className="w-full py-4 rounded-2xl text-white font-bold text-[15px] mt-4 disabled:opacity-50"
              style={{ background: '#3B82F6' }}>
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Campo({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div>
      <label className="text-gray-500 text-[11px] block mb-1">{label}</label>
      <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-xl px-4 py-3 text-white text-[14px] outline-none"
        style={{ background: '#0D0D14', border: '1px solid #2A2A3A' }} />
    </div>
  )
}

function SelectCampo({ label, value, onChange, opts }) {
  return (
    <div>
      <label className="text-gray-500 text-[11px] block mb-1">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full rounded-xl px-4 py-3 text-white text-[14px] outline-none"
        style={{ background: '#0D0D14', border: '1px solid #2A2A3A' }}>
        {opts.map(([v, l]) => <option key={v} value={v} className="bg-gray-900">{l}</option>)}
      </select>
    </div>
  )
}
