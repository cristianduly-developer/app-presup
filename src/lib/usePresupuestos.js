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

    // calcular totales
    const totalMat = items.filter(i => i.tipo === 'material').reduce((s, i) => s + i.cantidad * i.precio_unit, 0)
    const totalMO  = items.filter(i => i.tipo === 'mano_obra').reduce((s, i) => s + i.cantidad * i.precio_unit, 0)
    const total = totalMat + totalMO

    const fechaVence = datos.vigencia_dias
      ? new Date(Date.now() + datos.vigencia_dias * 86400000).toISOString().split('T')[0]
      : null

    const { data: presup, error } = await supabase
      .from('presupuestos')
      .insert({
        ...datos,
        user_id: user.id,
        total,
        total_materiales: totalMat,
        total_mano_obra: totalMO,
        margen_estimado: total - totalMat,
        fecha_vence: fechaVence,
        status: 'borrador',
      })
      .select().single()

    if (error) return { error }

    if (items.length > 0) {
      await supabase.from('presupuesto_items').insert(
        items.map((it, i) => ({ ...it, presupuesto_id: presup.id, orden: i }))
      )
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
      .from('presupuestos')
      .select(`*, clientes(nombre, telefono, direccion), presupuesto_items(*), pagos(monto), perfiles(nombre, oficio, telefono, logo_url)`)
      .eq('token_publico', token)
      .single()
      .then(({ data, error }) => {
        if (error) setError('Presupuesto no encontrado')
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
