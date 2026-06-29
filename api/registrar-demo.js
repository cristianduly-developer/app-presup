import { createClient } from '@supabase/supabase-js'

const DEMO_DIAS = 28
const APP_ID    = 'app-presup'
const OWNER_ID  = 'd8eef2e2-7e07-4ec9-9c6e-766addf89cc5'

async function isRateLimited(central, ip) {
  try {
    const { data } = await central.rpc('check_rate_limit', {
      p_key: `registrar-demo:${ip}`,
      p_max: 3,
      p_window_seconds: 3600,
    })
    return data === true
  } catch {
    return false
  }
}

export default async function handler(req, res) {
  const origin = req.headers['origin'] || ''
  const allowed = process.env.APP_ORIGIN || 'https://app-presup.vercel.app'
  const localDev = /^https?:\/\/localhost(:\d+)?$/.test(origin)
  if (origin === allowed || localDev) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' })

  // Rechazar bodies demasiado grandes (no esperamos body en este endpoint)
  const contentLength = parseInt(req.headers['content-length'] || '0', 10)
  if (contentLength > 4096) return res.status(413).json({ ok: false, error: 'payload_too_large' })

  const authHeader = req.headers['authorization'] || ''
  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) return res.status(401).json({ ok: false, error: 'no_auth' })

  if (!process.env.CENTRAL_URL || !process.env.CENTRAL_SERVICE_KEY) {
    console.error('[registrar-demo] Missing Central env vars')
    return res.status(500).json({ ok: false, error: 'config_error', detail: 'missing_central_vars' })
  }

  const central = createClient(process.env.CENTRAL_URL, process.env.CENTRAL_SERVICE_KEY)

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown'
  if (await isRateLimited(central, ip)) return res.status(429).json({ ok: false, error: 'rate_limited' })

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    console.error('[registrar-demo] Missing Supabase env vars:', { supabaseUrl: !!supabaseUrl, supabaseKey: !!supabaseKey })
    return res.status(500).json({ ok: false, error: 'config_error', detail: 'missing_supabase_vars' })
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

  // Notificar al panel admin
  central.from('notificaciones_admin').insert({
    tipo: 'nueva_org',
    mensaje: `Nueva cuenta demo en App Presupuestos — ${nombre} (${email})`,
    org_id: orgId,
    app_id: APP_ID,
  }).then(() => {})

  // Bienvenida al usuario + notificación al admin
  try {
    const fechaAlta = new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })
    const mailFrom = process.env.MAIL_FROM ?? 'onboarding@resend.dev'
    const appUrl = 'https://presupuestos.solucionesmdp.com.ar'

    const bienvenidaHtml = `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
        <div style="background:#0891b2;padding:32px 24px;text-align:center;">
          <div style="font-size:40px;">📋</div>
          <h1 style="color:white;margin:8px 0 4px;font-size:22px;">App Presupuestos</h1>
          <p style="color:rgba(255,255,255,.85);margin:0;font-size:14px;">Soluciones MDP</p>
        </div>
        <div style="padding:32px 24px;">
          <h2 style="margin:0 0 8px;font-size:20px;color:#111827;">¡Hola, ${nombre}!</h2>
          <p style="color:#374151;margin:0 0 24px;font-size:15px;line-height:1.6;">
            Tu prueba gratuita de <strong>${DEMO_DIAS} días</strong> ya está activa. Podés empezar a crear presupuestos profesionales ahora mismo.
          </p>
          <div style="background:#f9fafb;border-radius:10px;padding:20px;margin-bottom:24px;">
            <p style="margin:0 0 12px;font-weight:700;color:#111827;font-size:13px;text-transform:uppercase;letter-spacing:.5px;">¿Qué podés hacer?</p>
            <p style="margin:0 0 8px;color:#374151;font-size:14px;">✅ Crear y enviar presupuestos en segundos</p>
            <p style="margin:0 0 8px;color:#374151;font-size:14px;">✅ Gestionar clientes y ver el historial</p>
            <p style="margin:0 0 0;color:#374151;font-size:14px;">✅ Exportar presupuestos a PDF</p>
          </div>
          <div style="text-align:center;">
            <a href="${appUrl}" style="display:inline-block;background:#0891b2;color:white;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;">Abrir App Presupuestos →</a>
          </div>
          <div style="margin-top:20px;padding:16px;background:#f0f9ff;border-radius:10px;text-align:center;">
            <p style="margin:0 0 10px;font-size:14px;color:#374151;">¿No sabés por dónde empezar?</p>
            <a href="${appUrl}/ayuda" style="display:inline-block;background:#fff;color:#0891b2;padding:10px 24px;border-radius:8px;font-weight:600;font-size:13px;text-decoration:none;border:1px solid #bae6fd;">Ver guía de ayuda 📖</a>
          </div>
        </div>
        <div style="border-top:1px solid #f1f5f9;padding:20px 24px;text-align:center;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">Soluciones MDP · <a href="https://wa.me/5492235767784" style="color:#9ca3af;">WhatsApp</a> · <a href="https://www.instagram.com/soluciones_mdp" style="color:#9ca3af;">Instagram</a> · <a href="https://www.facebook.com/share/1D7keoQJe1/" style="color:#9ca3af;">Facebook</a></p><p style="margin:4px 0 0;color:#9ca3af;font-size:11px;text-align:center;">Seguinos en nuestras redes para enterarte de novedades y tips</p>
        </div>
      </div>`

    await Promise.all([
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.RESEND_API_KEY}` },
        body: JSON.stringify({
          from: mailFrom,
          to: email,
          subject: `¡Bienvenido/a a App Presupuestos! Tu prueba de ${DEMO_DIAS} días está activa`,
          html: bienvenidaHtml,
        }),
      }),
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.RESEND_API_KEY}` },
        body: JSON.stringify({
          from: mailFrom,
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
      }),
    ])
  } catch (e) {
    console.error('[registrar-demo] Error notificación:', e)
  }

  return res.status(200).json({ ok: true })
}
