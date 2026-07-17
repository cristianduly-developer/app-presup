import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)
  const userRef = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u); userRef.current = u
      if (u) cargarPerfil(u.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      const u = session?.user ?? null
      setUser(u); userRef.current = u
      if (u) cargarPerfil(u.id)
      else { setPerfil(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const INACTIVITY_MS = 30 * 60 * 1000
    let timer = null
    const reset = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => { if (userRef.current) supabase.auth.signOut() }, INACTIVITY_MS)
    }
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll']
    events.forEach(e => window.addEventListener(e, reset, { passive: true }))
    reset()
    return () => {
      if (timer) clearTimeout(timer)
      events.forEach(e => window.removeEventListener(e, reset))
    }
  }, [])

  async function cargarPerfil(uid) {
    const { data } = await supabase.from('perfiles').select('*').eq('id', uid).maybeSingle()
    if (data) {
      setPerfil(data)
    } else {
      // perfil no existe (trigger falló) → lo creamos ahora
      const { data: { user } } = await supabase.auth.getUser()
      const nombre = user?.user_metadata?.full_name || user?.user_metadata?.name || ''
      const email  = user?.email || ''
      const { data: nuevo } = await supabase
        .from('perfiles').upsert({ id: uid, email, nombre }, { onConflict: 'id', ignoreDuplicates: false }).select().single()
      setPerfil(nuevo)
    }
    setLoading(false)
  }

  async function login(email, password) {
    return supabase.auth.signInWithPassword({ email, password })
  }

  async function registro(email, password, nombre) {
    return supabase.auth.signUp({ email, password, options: { data: { nombre } } })
  }

  async function logout() {
    return supabase.auth.signOut()
  }

  async function actualizarPerfil(datos) {
    const { data, error } = await supabase
      .from('perfiles').update(datos).eq('id', user.id).select().single()
    if (!error) setPerfil(data)
    return { data, error }
  }

  return { user, perfil, loading, login, registro, logout, actualizarPerfil }
}
