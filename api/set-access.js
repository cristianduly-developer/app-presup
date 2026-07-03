import { createClient } from '@supabase/supabase-js'

async function findUserByEmail(supa, email) {
  const target = email?.toLowerCase()
  if (!target) return null
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supa.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) return null
    const found = data.users.find(u => u.email?.toLowerCase() === target)
    if (found) return found
    if (data.users.length < 1000) break
  }
  return null
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'content-type, x-app-key')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ ok: false })

  const appKey = req.headers['x-app-key']
  if (!process.env.ERROR_REPORT_KEY || appKey !== process.env.ERROR_REPORT_KEY) {
    return res.status(401).json({ ok: false, error: 'no_auth' })
  }

  const { org_id, valid_until, plan } = req.body || {}
  if (!org_id || !valid_until) {
    return res.status(400).json({ ok: false, error: 'org_id y valid_until requeridos' })
  }

  const central = createClient(process.env.CENTRAL_URL, process.env.CENTRAL_SERVICE_KEY)
  const { data: org } = await central.from('organizaciones').select('email_contacto').eq('id', org_id).single()
  if (!org) return res.status(404).json({ ok: false, error: 'org_not_found' })

  const supa = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const user = await findUserByEmail(supa, org.email_contacto)
  if (!user) return res.status(200).json({ ok: true, msg: 'user_not_found_in_satellite' })

  const row = { tenant_id: user.id, valid_until }
  if (plan) row.plan = plan

  const { error } = await supa.from('tenant_access').upsert(row, { onConflict: 'tenant_id' })
  if (error) return res.status(500).json({ ok: false, error: error.message })

  return res.status(200).json({ ok: true })
}
