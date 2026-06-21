import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { LIMITES } from './PlanContext'
import { showToast } from './toast'

export function useObras() {
  const [obras, setObras] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    const { data } = await supabase
      .from('obras_resumen')
      .select('*')
      .order('fecha_inicio', { ascending: false })
      .limit(300)
    setObras(data || [])
    setLoading(false)
  }

  async function crear(datos, plan = 'basico') {
    const limiteNum = LIMITES[plan]?.obras === Infinity ? 0 : (LIMITES[plan]?.obras ?? 30)
    const { data, error } = await supabase.rpc('crear_obra_con_limite', {
      p_nombre:         datos.nombre,
      p_presupuesto_id: datos.presupuesto_id || null,
      p_fecha_inicio:   datos.fecha_inicio || null,
      p_direccion:      datos.direccion || null,
      p_limite:         limiteNum,
    })
    if (error) {
      if (error.message?.includes('LIMITE_PLAN')) {
        const msg = error.message.replace('LIMITE_PLAN: ', '')
        return { error: { message: msg, tipo: 'limite' } }
      }
      return { error }
    }
    await cargar()
    return { data, error: null }
  }

  async function actualizarStatus(id, status) {
    await supabase.from('obras').update({ status }).eq('id', id)
    await cargar()
  }

  async function registrarGasto(obraId, descripcion, monto, categoria = 'material') {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('gastos').insert({ user_id: user.id, obra_id: obraId, descripcion, monto, categoria, fecha: new Date().toISOString().split('T')[0] })
    if (error) { showToast('No se pudo registrar el gasto. Intentá de nuevo.', 'error'); return { error } }
    showToast('Gasto registrado')
    await cargar()
    return { error: null }
  }

  async function registrarHoras(obraId, cantidad, descripcion = '') {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('horas').insert({ user_id: user.id, obra_id: obraId, cantidad, descripcion, fecha: new Date().toISOString().split('T')[0] })
    if (error) { showToast('No se pudieron registrar las horas. Intentá de nuevo.', 'error'); return { error } }
    showToast('Horas registradas')
    await cargar()
    return { error: null }
  }

  return { obras, loading, cargar, crear, actualizarStatus, registrarGasto, registrarHoras }
}
