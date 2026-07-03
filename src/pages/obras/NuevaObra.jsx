import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase, mensajeErrorGuardado } from '../../lib/supabase'
import { useAuth } from '../../lib/useAuth'
import { useClientes } from '../../lib/useClientes'
import { usePlan, LIMITES } from '../../lib/PlanContext'

export default function NuevaObra() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { clientes } = useClientes()
  const plan = usePlan()
  const [limiteError, setLimiteError] = useState('')
  const [form, setForm] = useState({
    nombre: '', cliente_id: '', direccion: '', descripcion: '',
    total: '', fecha_inicio: new Date().toISOString().split('T')[0],
  })
  const [guardando, setGuardando] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function guardar() {
    if (!form.nombre.trim()) return
    const limite = LIMITES[plan]?.obras ?? 30
    if (limite !== Infinity) {
      const { count } = await supabase.from('obras')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('status', ['en_ejecucion', 'pendiente_cobro'])
      if (count >= limite) {
        setLimiteError(`Tu plan ${plan} permite hasta ${limite} obras activas. Ya tenés ${count}.`)
        return
      }
    }
    setGuardando(true)
    const { data, error } = await supabase.from('obras').insert({
      user_id:     user.id,
      nombre:      form.nombre,
      cliente_id:  form.cliente_id || null,
      direccion:   form.direccion,
      descripcion: form.descripcion,
      total:       Number(form.total) || 0,
      fecha_inicio: form.fecha_inicio,
      status:      'en_ejecucion',
    }).select().single()
    setGuardando(false)
    if (!error && data) navigate(`/obras/${data.id}`)
    else if (error) setLimiteError(mensajeErrorGuardado(error) || 'No se pudo guardar la obra. Intentá de nuevo.')
  }

  return (
    <div className="flex-1 overflow-y-auto pb-24" style={{ background: '#0D0D14' }}>
      <div className="flex items-center gap-3 px-4 pt-12 pb-4">
        <button onClick={() => navigate(-1)} className="text-gray-400"><ArrowLeft size={22} /></button>
        <h1 className="text-white font-bold text-[20px]">Nueva obra</h1>
      </div>

      <div className="px-4 flex flex-col gap-4">
        <div>
          <label className="text-gray-500 text-[11px] block mb-1.5">Nombre de la obra *</label>
          <input value={form.nombre} onChange={e => set('nombre', e.target.value)}
            placeholder="Ej: Instalación gas cocina Pérez"
            className="w-full rounded-2xl px-4 py-3.5 text-white text-[14px] outline-none"
            style={{ background: '#161622', border: '1px solid #1E1E2E' }} />
        </div>

        <div>
          <label className="text-gray-500 text-[11px] block mb-1.5">Cliente</label>
          <select value={form.cliente_id} onChange={e => set('cliente_id', e.target.value)}
            className="w-full rounded-2xl px-4 py-3.5 text-white text-[14px] outline-none appearance-none"
            style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
            <option value="">Sin cliente asignado</option>
            {clientes.map(c => <option key={c.id} value={c.id} style={{ background: '#161622' }}>{c.nombre}</option>)}
          </select>
        </div>

        <div>
          <label className="text-gray-500 text-[11px] block mb-1.5">Monto total estimado</label>
          <input type="number" value={form.total} onChange={e => set('total', e.target.value)}
            placeholder="0"
            className="w-full rounded-2xl px-4 py-3.5 text-white text-[14px] outline-none"
            style={{ background: '#161622', border: '1px solid #1E1E2E' }} />
        </div>

        <div>
          <label className="text-gray-500 text-[11px] block mb-1.5">Fecha de inicio</label>
          <input type="date" value={form.fecha_inicio} onChange={e => set('fecha_inicio', e.target.value)}
            className="w-full rounded-2xl px-4 py-3.5 text-white text-[14px] outline-none"
            style={{ background: '#161622', border: '1px solid #1E1E2E' }} />
        </div>

        <div>
          <label className="text-gray-500 text-[11px] block mb-1.5">Dirección</label>
          <input value={form.direccion} onChange={e => set('direccion', e.target.value)}
            placeholder="Opcional"
            className="w-full rounded-2xl px-4 py-3.5 text-white text-[14px] outline-none"
            style={{ background: '#161622', border: '1px solid #1E1E2E' }} />
        </div>

        <div>
          <label className="text-gray-500 text-[11px] block mb-1.5">Descripción</label>
          <textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value)}
            placeholder="Detalle del trabajo a realizar..." rows={3}
            className="w-full rounded-2xl px-4 py-3 text-white text-[13px] outline-none resize-none"
            style={{ background: '#161622', border: '1px solid #1E1E2E' }} />
        </div>

        {limiteError && (
          <div className="rounded-2xl p-4 text-center" style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)' }}>
            <p className="text-red-400 text-[13px]">🚫 {limiteError}</p>
            <p className="text-gray-500 text-[11px] mt-1">Mejorá tu plan para seguir creando</p>
          </div>
        )}
        <button onClick={guardar} disabled={guardando || !form.nombre.trim()}
          className="w-full py-4 rounded-2xl text-white font-bold text-[15px] mt-2 disabled:opacity-50"
          style={{ background: '#3B82F6' }}>
          {guardando ? 'Creando obra...' : 'Crear obra'}
        </button>
      </div>
    </div>
  )
}
