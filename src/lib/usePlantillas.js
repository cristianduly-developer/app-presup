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
      .select('*, plantilla_items(*)')
      .order('usos', { ascending: false })
    setPlantillas(data || [])
    setLoading(false)
  }

  async function crear(datos, items) {
    const { data: p, error } = await supabase
      .from('plantillas')
      .insert({ ...datos, usos: 0 })
      .select()
      .single()
    if (error || !p) return { error }
    if (items?.length) {
      await supabase.from('plantilla_items').insert(
        items.map(it => ({ ...it, plantilla_id: p.id }))
      )
    }
    await cargar()
    return { data: p }
  }

  async function eliminar(id) {
    await supabase.from('plantillas').delete().eq('id', id)
    setPlantillas(ps => ps.filter(p => p.id !== id))
  }

  async function incrementarUso(id) {
    await supabase.rpc('incrementar_uso_plantilla', { p_id: id }).catch(() => {
      supabase.from('plantillas').update({ usos: supabase.raw('usos + 1') }).eq('id', id)
    })
  }

  return { plantillas, loading, cargar, crear, eliminar, incrementarUso }
}
