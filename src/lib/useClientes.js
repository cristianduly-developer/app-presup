import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export function useClientes() {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    const { data } = await supabase
      .from('clientes').select('*').order('nombre').limit(500)
    setClientes(data || [])
    setLoading(false)
  }

  async function crear(datos) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('clientes').insert({ ...datos, user_id: user.id }).select().single()
    if (!error) setClientes(prev => [...prev, data])
    return { data, error }
  }

  async function actualizar(id, datos) {
    const { data, error } = await supabase
      .from('clientes').update(datos).eq('id', id).select().single()
    if (!error) setClientes(prev => prev.map(c => c.id === id ? data : c))
    return { data, error }
  }

  async function eliminar(id) {
    const { error } = await supabase.from('clientes').delete().eq('id', id)
    if (!error) setClientes(prev => prev.filter(c => c.id !== id))
    return { error }
  }

  return { clientes, loading, cargar, crear, actualizar, eliminar }
}
