import { useState, useEffect } from 'react'
import { supabase, mensajeErrorGuardado } from './supabase'
import { showToast } from './toast'

const TTL = 60_000
let _cache = null
let _cacheTs = 0
let _cacheUid = null

export function usePresupuestos() {
  const [presupuestos, setPresupuestos] = useState(_cache || [])
  const [loading, setLoading] = useState(!_cache)

  useEffect(() => { cargar() }, [])

  async function cargar(force = false) {
    const { data: { user: u } } = await supabase.auth.getUser()
    const uid = u?.id
    // invalidar cache si cambió el usuario
    if (_cacheUid && _cacheUid !== uid) { _cache = null; _cacheTs = 0 }
    if (!force && _cache && Date.now() - _cacheTs < TTL && _cacheUid === uid) {
      setPresupuestos(_cache)
      setLoading(false)
      return
    }
    setLoading(true)
    _cacheUid = uid
    const { data } = await supabase
      .from('presupuestos')
      .select(`id, numero, titulo, status, total, fecha_vence, fecha_envio, created_at, token_publico, vigencia_dias, cliente_id, clientes(nombre, telefono), pagos(monto)`)
      .order('created_at', { ascending: false })
    _cache = data || []
    _cacheTs = Date.now()
    setPresupuestos(_cache)
    setLoading(false)
  }

  async function cargarItems(presupuestoId) {
    const { data } = await supabase
      .from('presupuesto_items')
      .select('*')
      .eq('presupuesto_id', presupuestoId)
      .order('orden')
    return data || []
  }

  async function crear(datos, items) {
    const { data: { user } } = await supabase.auth.getUser()

    const totalMat = items.filter(i => i.tipo === 'material').reduce((s, i) => s + i.cantidad * i.precio_unit, 0)
    const totalMO  = items.filter(i => i.tipo === 'mano_obra').reduce((s, i) => s + i.cantidad * i.precio_unit, 0)
    const total = totalMat + totalMO
    const fechaVence = datos.vigencia_dias
      ? new Date(Date.now() + datos.vigencia_dias * 86400000).toISOString().split('T')[0]
      : null

    // número correlativo
    const { data: maxData } = await supabase
      .from('presupuestos')
      .select('numero')
      .eq('user_id', user.id)
      .order('numero', { ascending: false })
      .limit(1)
      .maybeSingle()
    const numero = (maxData?.numero || 0) + 1

    // token público aleatorio
    const token = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0')).join('')

    const { data: presup, error } = await supabase
      .from('presupuestos')
      .insert({
        user_id:          user.id,
        numero,
        titulo:           datos.titulo || '',
        cliente_id:       datos.cliente_id || null,
        status:           datos.status || 'borrador',
        total,
        total_materiales: totalMat,
        total_mano_obra:  totalMO,
        margen_estimado:  total - totalMat,
        vigencia_dias:    datos.vigencia_dias || 5,
        notas_internas:   datos.notas_internas || '',
        fecha_vence:      fechaVence,
        token_publico:    token,
      })
      .select('id, numero, token_publico')
      .single()

    if (error) {
      const paywall = mensajeErrorGuardado(error)
      if (paywall) return { error: { message: paywall, tipo: 'paywall' } }
      return { error }
    }

    if (items.length > 0) {
      const { error: itemsError } = await supabase.from('presupuesto_items').insert(
        items.map((it, i) => ({
          presupuesto_id: presup.id,
          tipo:           it.tipo,
          descripcion:    it.descripcion,
          unidad:         it.unidad || '',
          cantidad:       it.tipo === 'seccion' ? 0 : (it.cantidad || 0),
          precio_unit:    it.tipo === 'seccion' ? 0 : (it.precio_unit || 0),
          subtotal:       it.tipo === 'seccion' ? 0 : (it.cantidad || 0) * (it.precio_unit || 0),
          orden:          i,
        }))
      )
      if (itemsError) {
        await supabase.from('presupuestos').delete().eq('id', presup.id)
        return { error: itemsError }
      }
    }

    _cacheTs = 0
    await cargar(true)
    return { data: presup }
  }

  async function actualizarStatus(id, status) {
    const extra = status === 'enviado' ? { fecha_envio: new Date().toISOString().split('T')[0] } : {}
    const { error } = await supabase.from('presupuestos').update({ status, ...extra }).eq('id', id)
    if (error) { showToast(mensajeErrorGuardado(error) || 'No se pudo actualizar el estado. Intentá de nuevo.', 'error'); return { error } }
    _cacheTs = 0
    await cargar(true)
    return { error: null }
  }

  async function registrarPago(presupuestoId, obraId, monto, metodo = 'efectivo') {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('pagos').insert({ user_id: user.id, presupuesto_id: presupuestoId, obra_id: obraId, monto, metodo, fecha: new Date().toISOString().split('T')[0] })
    if (error) { showToast(mensajeErrorGuardado(error) || 'No se pudo registrar el pago. Intentá de nuevo.', 'error'); return { error } }
    showToast('Pago registrado')
    _cacheTs = 0
    await cargar()
    return { error: null }
  }

  return { presupuestos, loading, cargar, cargarItems, crear, actualizarStatus, registrarPago }
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

  async function rechazar() {
    const { data: result } = await supabase.rpc('rechazar_presupuesto', { p_token: token })
    return result
  }

  async function aceptar(firma = {}) {
    const { data: result } = await supabase.rpc('aceptar_presupuesto', { p_token: token })
    if (result?.ok && firma.firma_imagen) {
      const { error: firmaErr } = await supabase.from('presupuestos')
        .update({
          firma_imagen: firma.firma_imagen,
          firma_nombre: firma.firma_nombre || '',
          firma_fecha:  new Date().toISOString(),
        })
        .eq('token_publico', token)
      if (firmaErr) console.error('[aceptar] firma no guardada:', firmaErr.message)
    }
    return result
  }

  return { data, loading, error, aceptar, rechazar }
}
