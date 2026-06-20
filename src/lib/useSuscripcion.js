import { supabase } from './supabase'

export async function verificarSuscripcion() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) return null

    const res = await fetch('/api/verificar-acceso', {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}
