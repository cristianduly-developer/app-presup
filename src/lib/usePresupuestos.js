import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export function usePresupuestos() {
  const [presupuestos, setPresupuestos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    const { data } = await supabase
      .from('presupuestos')
      .select(`*, clientes(nombre, telefono, direccion), presupuesto_items(*), pagos(monto)`)
      .order('created_at', { ascending: false })
    setPresupuestos(data || [])
    setLoading(false)
  }

  async function crear(datos, items) {
    const { data: { user } } = await supabase.auth.getUser()

    const totalMat = items.filter(i => i.tipo === 'material').reduce((s, i) => s + i.cantidad * i.precio_unit, 0)
    const totalMO  = items.filter(i => i.tipo === 'mano_obra').reduce((s, i) => s + i.cantidad * i.precio_unit, 0)
    const total = totalMat + totalMO
    const fechaVence = datos.vigencia_dias
      ? new Date(Date.now() + datos.vigencia_dias * 86400000).toISOString().split('T')[0]
      : null

    const { data: presup, error } = await supabase.rpc('crear_presupuesto', {
      p_user_id:         user.id,
      p_cliente_id:      datos.cliente_id || null,
      p_vigencia_dias:   datos.vigencia_dias || 5,
      p_notas_internas:  datos.notas_internas || '',
      p_status:          datos.status || 'borrador',
      p_total:           total,
      p_total_materiales: totalMat,
      p_total_mano_obra:  totalMO,
      p_margen_estimado:  total - totalMat,
      p_fecha_vence:     fechaVence,
      p_items:           items.map((it, i) => ({ ...it, orden: i })),
    })

    if (error) {
      if (error.message?.includes('LIMITE_PLAN')) {
        const msg = error.message.replace('LIMITE_PLAN: ', '')
        return { error: { message: msg, tipo: 'limite' } }
      }
      return { error }
    }
    if (datos.titulo && presup?.id) {
      await supabase.from('presupuestos').update({ titulo: datos.titulo }).eq('id', presup.id)
    }
    await cargar()
    return { data: presup }
  }

  async function actualizarStatus(id, status) {
    const extra = status === 'enviado' ? { fecha_envio: new Date().toISOString().split('T')[0] } : {}
    await supabase.from('presupuestos').update({ status, ...extra }).eq('id', id)
    await cargar()
  }

  async function registrarPago(presupuestoId, obraId, monto, metodo = 'efectivo') {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('pagos').insert({ user_id: user.id, presupuesto_id: presupuestoId, obra_id: obraId, monto, metodo, fecha: new Date().toISOString().split('T')[0] })
    await cargar()
  }

  return { presupuestos, loading, cargar, crear, actualizarStatus, registrarPago }
}

export function usePresupuestoPublico(token) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!token) return
    supabase
      .rpc('get_presupuesto_publico', { p_token: token })
      .then(({ data, error }) => {
        if (error || !data) setError('Presupuesto no encontrado')
        else setData(data)
        setLoading(false)
      })
  }, [token])

  async function aceptar() {
    const { data: result } = await supabase.rpc('aceptar_presupuesto', { p_token: token })
    return result
  }

  return { data, loading, error, aceptar }
}
