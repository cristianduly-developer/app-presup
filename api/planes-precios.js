import { createClient } from '@supabase/supabase-js'

const APP_ID = 'app-presup'

export default async function handler(req, res) {
  const origin = req.headers['origin'] || ''
  const allowed = process.env.APP_ORIGIN || 'https://app-presup.vercel.app'
  if (origin === allowed || origin.endsWith('.vercel.app')) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'content-type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' })

  const central = createClient(process.env.CENTRAL_URL, process.env.CENTRAL_SERVICE_KEY)
  const { data, error } = await central
    .from('planes_precios')
    .select('plan, precio_mensual, beneficios')
    .eq('app_id', APP_ID)

  if (error) return res.status(500).json({ ok: false, error: error.message })
  return res.status(200).json({ ok: true, planes: data || [] })
}
