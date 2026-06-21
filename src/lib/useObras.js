import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { LIMITES } from './PlanContext'
import { showToast } from './toast'

const TTL = 60_000
let _cache = null
let _cacheTs = 0

export function useObras() {
  const [obras, setObras] = useState(_cache || [])
  const [loading, setLoading] = useState(!_cache)

  useEffect(() => { cargar() }, [])

  async function cargar(force = false) {
    if (!force && _cache && Date.now() - _cacheTs < TTL) {
      setObras(_cache)
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('obras_resumen')
      .select('*')
      .order('fecha_inicio', { ascending: false })
      .limit(300)
    _cache = data || []
    _cacheTs = Date.now()
    setObras(_cache)
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
    _cacheTs = 0
    await cargar(true)
    return { data, error: null }
  }

  async function actualizarStatus(id, status) {
    await supabase.from('obras').update({ status }).eq('id', id)
    _cacheTs = 0
    await cargar(true)
  }

  async function registrarGasto(obraId, descripcion, monto, categoria = 'material') {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('gastos').insert({ user_id: user.id, obra_id: obraId, descripcion, monto, categoria, fecha: new Date().toISOString().split('T')[0] })
    if (error) { showToast('No se pudo registrar el gasto. Intentá de nuevo.', 'error'); return { error } }
    showToast('Gasto registrado')
    _cacheTs = 0
    await cargar(true)
    return { error: null }
  }

  async function registrarHoras(obraId, cantidad, descripcion = '') {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('horas').insert({ user_id: user.id, obra_id: obraId, cantidad, descripcion, fecha: new Date().toISOString().split('T')[0] })
    if (error) { showToast('No se pudieron registrar las horas. Intentá de nuevo.', 'error'); return { error } }
    showToast('Horas registradas')
    _cacheTs = 0
    await cargar(true)
    return { error: null }
  }

  return { obras, loading, cargar, crear, actualizarStatus, registrarGasto, registrarHoras }
}
