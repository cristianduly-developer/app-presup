import { createClient } from '@supabase/supabase-js'

const APP_ID = 'app-presup'

export default async function handler(req, res) {
  const origin = req.headers['origin'] || ''
  const allowed = process.env.APP_ORIGIN || 'https://app-presup.vercel.app'
  if (origin === allowed || origin.endsWith('.vercel.app')) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' })

  const authHeader = req.headers['authorization'] || ''
  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) return res.status(401).json({ error: 'no_auth' })

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

  const supabaseApp = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  })
  const { data: { user }, error: userErr } = await supabaseApp.auth.getUser()
  if (userErr || !user?.email) return res.status(401).json({ error: 'no_auth' })

  const central = createClient(
    process.env.CENTRAL_URL,
    process.env.CENTRAL_SERVICE_KEY,
  )

  const { data, error } = await central.rpc('verificar_acceso_email', {
    email_param: user.email.toLowerCase(),
    app_id_param: APP_ID,
  })

  if (error) {
    console.error('[verificar-acceso] RPC error:', error)
    return res.status(200).json(null)
  }

  const acceso = Array.isArray(data) ? (data[0] ?? null) : null

  if (acceso && !acceso.tiene_acceso) {
    // Verificar si está suspendido/impago (el RPC filtra suspendido)
    const { data: empData } = await central
      .from('empleados_organizacion')
      .select('org_id')
      .eq('email', user.email.toLowerCase())
      .limit(1)

    if (empData?.length > 0) {
      const { data: subData } = await central
        .from('suscripciones_apps')
        .select('estado')
        .eq('org_id', empData[0].org_id)
        .eq('app_id', APP_ID)
        .in('estado', ['suspendido', 'impago'])
        .limit(1)
        .maybeSingle()

      if (subData?.estado) {
        return res.status(200).json({ tiene_acceso: false, estado: subData.estado })
      }
    }
  }

  return res.status(200).json(acceso)
}
