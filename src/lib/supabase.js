import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(url, key)

// Traduce un error de Supabase a un mensaje claro para el usuario.
// Devuelve null si no es un caso especial (el caller usa su mensaje genérico).
// - SIN_ACCESO: lo frenó el trigger del paywall en creaciones vía RPC.
// - 42501 / "row-level security": lo frenó una policy en escrituras directas.
export const mensajeErrorGuardado = (error) => {
  const msg = (error?.message || '').toLowerCase()
  const esPaywall =
    msg.includes('sin_acceso') ||
    error?.code === '42501' ||
    msg.includes('row-level security') ||
    msg.includes('row level security')
  if (esPaywall)
    return '🔒 Tu suscripción venció o está suspendida. Renovala para seguir cargando datos. Tus datos siguen guardados y podés verlos.'
  return null
}
