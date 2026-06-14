import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'

// Pantalla reutilizable para registrar gasto, pago u horas rápido
// URL: /registro/gasto  /registro/pago  /registro/horas

const CONFIG = {
  gasto: {
    titulo:      'Registrar gasto',
    emoji:       '🛒',
    color:       '#EF4444',
    tabla:       'gastos',
    campoMonto:  'monto',
    campos: [
      { key: 'descripcion', label: 'Descripción *', type: 'text', placeholder: 'Ej: Caño de cobre 3/4"' },
      { key: 'monto',       label: 'Monto *',       type: 'number', placeholder: '0' },
    ],
  },
  pago: {
    titulo:      'Registrar pago',
    emoji:       '💰',
    color:       '#22C55E',
    tabla:       'pagos',
    campoMonto:  'monto',
    campos: [
      { key: 'concepto',    label: 'Concepto',      type: 'text',   placeholder: 'Ej: Anticipo, saldo, etc.' },
      { key: 'monto',       label: 'Monto *',       type: 'number', placeholder: '0' },
    ],
  },
  horas: {
    titulo:      'Registrar horas',
    emoji:       '⏱',
    color:       '#3B82F6',
    tabla:       'horas',
    campoMonto:  'cantidad',
    campos: [
      { key: 'descripcion', label: 'Descripción',   type: 'text',   placeholder: 'Ej: Jornada completa' },
      { key: 'cantidad',    label: 'Horas *',       type: 'number', placeholder: '0' },
    ],
  },
}

export default function RegistroRapido() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tipo = searchParams.get('tipo') || 'gasto'
  const { user } = useAuth()
  const cfg = CONFIG[tipo] || CONFIG.gasto

  const [obras, setObras] = useState([])
  const [obraId, setObraId] = useState('')
  const [form, setForm] = useState({ fecha: new Date().toISOString().split('T')[0] })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('obras')
      .select('id, nombre')
      .in('status', ['en_ejecucion', 'pendiente_cobro'])
      .order('created_at', { ascending: false })
      .then(({ data }) => setObras(data || []))
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function guardar() {
    const valorPrincipal = form[cfg.campoMonto]
    if (!valorPrincipal) return
    setGuardando(true)
    setError('')
    const { error: err } = await supabase.from(cfg.tabla).insert({
      user_id:  user.id,
      obra_id:  obraId || null,
      ...form,
      fecha: form.fecha || new Date().toISOString().split('T')[0],
      [cfg.campoMonto]: Number(valorPrincipal) || 0,
    })
    setGuardando(false)
    if (err) { setError(err.message); return }
    if (obraId) navigate(`/obras/${obraId}`)
    else navigate('/obras')
  }

  return (
    <div className="flex-1 overflow-y-auto pb-24" style={{ background: '#0D0D14' }}>
      <div className="flex items-center gap-3 px-4 pt-12 pb-4">
        <button onClick={() => navigate(-1)} className="text-gray-400"><ArrowLeft size={22} /></button>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{cfg.emoji}</span>
          <h1 className="text-white font-bold text-[20px]">{cfg.titulo}</h1>
        </div>
      </div>

      <div className="px-4 flex flex-col gap-4">
        {/* selector de obra */}
        <div>
          <label className="text-gray-500 text-[11px] block mb-1.5">Obra asociada</label>
          <select value={obraId} onChange={e => setObraId(e.target.value)}
            className="w-full rounded-2xl px-4 py-3.5 text-white text-[14px] outline-none appearance-none"
            style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
            <option value="">Sin obra específica</option>
            {obras.map(o => <option key={o.id} value={o.id} style={{ background: '#161622' }}>{o.nombre}</option>)}
          </select>
          {obras.length === 0 && (
            <p className="text-gray-600 text-[11px] mt-1">No hay obras activas. Podés registrar igual.</p>
          )}
        </div>

        {/* campos dinámicos según tipo */}
        {cfg.campos.map(c => (
          <div key={c.key}>
            <label className="text-gray-500 text-[11px] block mb-1.5">{c.label}</label>
            <input type={c.type} value={form[c.key] || ''} onChange={e => set(c.key, e.target.value)}
              placeholder={c.placeholder}
              className="w-full rounded-2xl px-4 py-3.5 text-white text-[14px] outline-none"
              style={{ background: '#161622', border: '1px solid #1E1E2E' }} />
          </div>
        ))}

        {/* fecha */}
        <div>
          <label className="text-gray-500 text-[11px] block mb-1.5">Fecha</label>
          <input type="date" value={form.fecha || new Date().toISOString().split('T')[0]}
            onChange={e => set('fecha', e.target.value)}
            className="w-full rounded-2xl px-4 py-3.5 text-white text-[14px] outline-none"
            style={{ background: '#161622', border: '1px solid #1E1E2E' }} />
        </div>

        {error && <p className="text-red-400 text-[12px] text-center">{error}</p>}

        <button onClick={guardar} disabled={guardando || !form[cfg.campoMonto]}
          className="w-full py-4 rounded-2xl text-white font-bold text-[15px] mt-2 disabled:opacity-50"
          style={{ background: cfg.color }}>
          {guardando ? 'Guardando...' : `Guardar ${cfg.titulo.toLowerCase()}`}
        </button>
      </div>
    </div>
  )
}
