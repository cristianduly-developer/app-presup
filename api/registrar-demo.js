import { createClient } from '@supabase/supabase-js'

const DEMO_DIAS = 28
const APP_ID    = 'app-presup'
const OWNER_ID  = 'd8eef2e2-7e07-4ec9-9c6e-766addf89cc5'

// Rate limit: máx 3 registros por IP por hora
const ipLog = new Map()
function isRateLimited(ip) {
  const ahora = Date.now()
  const ventana = 60 * 60 * 1000 // 1 hora
  const hits = (ipLog.get(ip) || []).filter(t => ahora - t < ventana)
  hits.push(ahora)
  ipLog.set(ip, hits)
  return hits.length > 3
}

export default async function handler(req, res) {
  const origin = req.headers['origin'] || ''
  const allowed = process.env.APP_ORIGIN || 'https://app-presup.vercel.app'
  if (origin === allowed || origin.endsWith('.vercel.app')) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' })

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown'
  if (isRateLimited(ip)) return res.status(429).json({ ok: false, error: 'rate_limited' })

  const authHeader = req.headers['authorization'] || ''
  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) return res.status(401).json({ ok: false, error: 'no_auth' })

  // Validate user token using local Supabase
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    console.error('[registrar-demo] Missing Supabase env vars:', { supabaseUrl: !!supabaseUrl, supabaseKey: !!supabaseKey })
    return res.status(500).json({ ok: false, error: 'config_error', detail: 'missing_supabase_vars' })
  }
  if (!process.env.CENTRAL_URL || !process.env.CENTRAL_SERVICE_KEY) {
    console.error('[registrar-demo] Missing Central env vars')
    return res.status(500).json({ ok: false, error: 'config_error', detail: 'missing_central_vars' })
  }

  const supabaseApp = createClient(
    supabaseUrl,
    supabaseKey,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data: { user }, error: userErr } = await supabaseApp.auth.getUser()
  if (userErr || !user?.email) {
    console.error('[registrar-demo] Auth error:', userErr?.message)
    return res.status(401).json({ ok: false, error: 'no_auth' })
  }

  const email = user.email.toLowerCase().trim()
  const nombreGoogle = user.user_metadata?.full_name?.trim() || null

  const central = createClient(
    process.env.CENTRAL_URL,
    process.env.CENTRAL_SERVICE_KEY,
  )

  // Check if org already exists
  const { data: orgsExistentes, error: orgQueryErr } = await central
    .from('organizaciones')
    .select('id')
    .eq('email_contacto', email)
    .limit(1)

  if (orgQueryErr) {
    console.error('[registrar-demo] Error buscando org:', orgQueryErr)
    return res.status(500).json({ ok: false, error: 'error_central' })
  }

  let orgId

  if (orgsExistentes && orgsExistentes.length > 0) {
    orgId = orgsExistentes[0].id
    const { data: subExistente } = await central
      .from('suscripciones_apps')
      .select('id')
      .eq('org_id', orgId)
      .eq('app_id', APP_ID)
      .limit(1)
      .maybeSingle()
    if (subExistente) return res.status(200).json({ ok: true, ya_existe: true })
  } else {
    const nombre = email
      .split('@')[0]
      .replace(/[._]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase())
    const { data: org, error: orgErr } = await central
      .from('organizaciones')
      .insert({ nombre: nombreGoogle || nombre, email_contacto: email, owner_id: OWNER_ID })
      .select('id')
      .single()
    if (orgErr || !org) {
      console.error('[registrar-demo] Error creando org:', orgErr)
      return res.status(500).json({ ok: false, error: 'error_central' })
    }
    orgId = org.id
  }

  // Ensure employee record exists
  const { error: empErr } = await central
    .from('empleados_organizacion')
    .upsert({ org_id: orgId, email }, { onConflict: 'org_id,email', ignoreDuplicates: true })
  if (empErr) console.error('[registrar-demo] Error empleado:', empErr)

  // Create demo subscription
  const hoy = new Date().toISOString().slice(0, 10)
  const vencimiento = new Date(Date.now() + DEMO_DIAS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const { error: subErr } = await central
    .from('suscripciones_apps')
    .insert({
      org_id:            orgId,
      app_id:            APP_ID,
      plan:              'profesional',
      estado:            'demo',
      fecha_inicio_demo: hoy,
      limite_demo_dias:  DEMO_DIAS,
      fecha_vencimiento: vencimiento,
    })

  if (subErr) {
    console.error('[registrar-demo] Error creando suscripción:', subErr)
    return res.status(500).json({ ok: false, error: 'error_central' })
  }

  // Notify admin
  try {
    await central.from('notificaciones_admin').insert({ org_id: orgId, tipo: 'nueva_org', app_id: APP_ID })
    const fechaAlta = new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to: 'cristianduly@gmail.com',
        subject: `🆕 Nueva cuenta demo — ${nombreGoogle ?? email}`,
        html: `<h2>🆕 Nueva cuenta demo en App Presup</h2>
          <table style="border-collapse:collapse;font-family:sans-serif;">
            <tr><td style="padding:8px;font-weight:bold;">Nombre</td><td style="padding:8px;">${nombreGoogle ?? '—'}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;">Email</td><td style="padding:8px;">${email}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;">App</td><td style="padding:8px;">App Presup</td></tr>
            <tr><td style="padding:8px;font-weight:bold;">Plan</td><td style="padding:8px;">Profesional (demo)</td></tr>
            <tr><td style="padding:8px;font-weight:bold;">Días de prueba</td><td style="padding:8px;">${DEMO_DIAS} días</td></tr>
            <tr><td style="padding:8px;font-weight:bold;">Fecha de alta</td><td style="padding:8px;">${fechaAlta}</td></tr>
          </table>`,
      }),
    })
  } catch (e) {
    console.error('[registrar-demo] Error notificación:', e)
  }

  return res.status(200).json({ ok: true })
}
