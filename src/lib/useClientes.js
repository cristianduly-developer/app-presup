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

  return { clientes, loading, cargar, crear }
}
