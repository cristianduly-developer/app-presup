import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export function usePlantillas() {
  const [plantillas, setPlantillas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    const { data } = await supabase
      .from('plantillas')
      .select('*')
      .order('created_at', { ascending: false })
    setPlantillas(data || [])
    setLoading(false)
  }

  async function crear(nombre, items) {
    const { data: { user } } = await supabase.auth.getUser()
    const totalEstimado = items.reduce((s, i) => s + (i.cantidad || 1) * (i.precio_unit || 0), 0)
    const { error } = await supabase.from('plantillas').insert({
      user_id: user.id,
      nombre,
      items,
      total_estimado: totalEstimado,
    })
    await cargar()
    return { error }
  }

  async function eliminar(id) {
    await supabase.from('plantillas').delete().eq('id', id)
    setPlantillas(ps => ps.filter(p => p.id !== id))
  }

  return { plantillas, loading, cargar, crear, eliminar }
}
