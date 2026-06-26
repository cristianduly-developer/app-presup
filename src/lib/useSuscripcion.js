import { supabase } from './supabase'

export async function verificarSuscripcion({ esLogin = false } = {}) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) return null

    const url = esLogin ? '/api/verificar-acceso?login=true' : '/api/verificar-acceso'
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}
