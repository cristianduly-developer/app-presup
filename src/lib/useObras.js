import { useState, useEffect } from 'react'
import { supabase } from './supabase'

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
    setObras(data || [])
    setLoading(false)
  }

  async function crear(datos) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('obras').insert({ ...datos, user_id: user.id }).select().single()
    if (!error) await cargar()
    return { data, error }
  }

  async function actualizarStatus(id, status) {
    await supabase.from('obras').update({ status }).eq('id', id)
    await cargar()
  }

  async function registrarGasto(obraId, descripcion, monto, categoria = 'material') {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('gastos').insert({ user_id: user.id, obra_id: obraId, descripcion, monto, categoria, fecha: new Date().toISOString().split('T')[0] })
    await cargar()
  }

  async function registrarHoras(obraId, cantidad, descripcion = '') {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('horas').insert({ user_id: user.id, obra_id: obraId, cantidad, descripcion, fecha: new Date().toISOString().split('T')[0] })
    await cargar()
  }

  return { obras, loading, cargar, crear, actualizarStatus, registrarGasto, registrarHoras }
}
