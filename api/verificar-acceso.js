import { createClient } from '@supabase/supabase-js'

const APP_ID = 'app-presup'

// Rate limit: máx 30 verificaciones por IP por hora
const ipLog = new Map()
function isRateLimited(ip) {
  const ahora = Date.now()
  const ventana = 60 * 60 * 1000
  const hits = (ipLog.get(ip) || []).filter(t => ahora - t < ventana)
  hits.push(ahora)
  ipLog.set(ip, hits)
  return hits.length > 30
}

export default async function handler(req, res) {
  const origin = req.headers['origin'] || ''
  const allowed = process.env.APP_ORIGIN || 'https://app-presup.vercel.app'
  if (origin === allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' })

  // Bearer token no debería superar los 2 KB
  const authHeader2 = req.headers['authorization'] || ''
  if (authHeader2.length > 2048) return res.status(400).json({ error: 'invalid_auth' })

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown'
  if (isRateLimited(ip)) return res.status(429).json({ error: 'rate_limited' })

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
    return res.status(503).json({ ok: false, error: 'servicio_no_disponible' })
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

  if (acceso?.tiene_acceso) {
    const updatePayload = { ultimo_acceso: new Date().toISOString() }
    if (req.query.login === 'true') {
      const { data: subRow } = await central
        .from('suscripciones_apps')
        .select('cant_sesiones')
        .eq('app_id', APP_ID)
        .eq('org_id', acceso.ret_org_id)
        .maybeSingle()
      updatePayload.cant_sesiones = (subRow?.cant_sesiones ?? 0) + 1
    }
    central.from('suscripciones_apps')
      .update(updatePayload)
      .eq('app_id', APP_ID)
      .eq('org_id', acceso.ret_org_id)
      .then(() => {})

    // Sincronizar plan del SaaS central → perfiles (para que las RPCs lean el plan correcto)
    const planCentral = acceso.plan || 'basico'
    const estadoCentral = acceso.estado || 'activo'
    let planDB
    if (estadoCentral === 'demo') {
      planDB = 'demo'
    } else if (planCentral === 'sincargo') {
      planDB = 'profesional'
    } else if (['basico', 'profesional', 'premium'].includes(planCentral)) {
      planDB = planCentral
    } else {
      planDB = 'basico'
    }
    supabaseApp.from('perfiles')
      .update({ plan: planDB })
      .eq('id', user.id)
      .then(() => {})
  }

  res.setHeader('Cache-Control', 'private, max-age=120')
  return res.status(200).json(acceso)
}
