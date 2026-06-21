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

  const nombre = nombreGoogle || email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  const { data: rpcResult, error: rpcErr } = await central.rpc('registrar_demo', {
    p_email:     email,
    p_nombre:    nombre,
    p_app_id:    APP_ID,
    p_owner_id:  OWNER_ID,
    p_demo_dias: DEMO_DIAS,
  })

  if (rpcErr) {
    console.error('[registrar-demo] Error RPC:', rpcErr)
    return res.status(500).json({ ok: false, error: 'error_central' })
  }

  if (rpcResult?.ya_existe) return res.status(200).json({ ok: true, ya_existe: true })

  const orgId = rpcResult?.org_id

  // Notify admin
  try {
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
