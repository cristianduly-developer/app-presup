// Verifica acceso contra el Supabase Central del SaaS
const CENTRAL_URL = 'https://ngymvfvlknaltsvsrvjm.supabase.co'
const CENTRAL_KEY = 'sb_publishable_CJQPQElcEzA9CACfuNllYg_Pe9lwvXy'
const APP_ID      = 'app-presup'

export async function verificarSuscripcion(email) {
  try {
    const res = await fetch(`${CENTRAL_URL}/rest/v1/rpc/verificar_acceso_email`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey':        CENTRAL_KEY,
        'Authorization': `Bearer ${CENTRAL_KEY}`,
      },
      body: JSON.stringify({ email_param: email, app_id_param: APP_ID }),
    })
    const data = await res.json()
    return Array.isArray(data) ? (data[0] || null) : null
  } catch {
    return null
  }
}
