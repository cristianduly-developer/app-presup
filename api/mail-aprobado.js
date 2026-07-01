const MAIL_FROM      = 'App Presupuestos <noreply-presupuestos@solucionesmdp.com.ar>'
const APP_URL        = 'https://presupuestos.solucionesmdp.com.ar'
const WA_SOPORTE     = '5492235767784'
const SUPABASE_URL   = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''

async function subirFirmaStorage(base64, presupuestoId) {
  if (!base64?.startsWith('data:image')) return null
  try {
    const matches = base64.match(/^data:(.+);base64,(.+)$/)
    if (!matches) return null
    const [, mime, data] = matches
    const buf = Buffer.from(data, 'base64')
    const path = `firmas/${presupuestoId}_${Date.now()}.png`
    const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/firmas/${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': mime,
        'x-upsert': 'true',
      },
      body: buf,
    })
    if (!uploadRes.ok) return null
    return `${SUPABASE_URL}/storage/v1/object/public/firmas/${path}`
  } catch { return null }
}

function fmt(n) {
  return '$' + Number(n || 0).toLocaleString('es-AR')
}

function fmtFecha(str) {
  if (!str) return ''
  return new Date(str).toLocaleDateString('es-AR')
}

function tablaItems(items) {
  const filas = (items || []).map(i => {
    if (i.tipo === 'seccion') return `
      <tr>
        <td colspan="4" style="padding:8px 12px;background:#f0f4f0;border-left:3px solid #3D5A3E;font-size:10px;font-weight:700;color:#3D5A3E;text-transform:uppercase;letter-spacing:.5px;">
          ${i.descripcion || 'Etapa'}
        </td>
      </tr>`
    return `
      <tr style="border-bottom:1px solid #f0f0f0;">
        <td style="padding:9px 12px;color:#1A1A1A;font-weight:600;font-size:13px;">
          ${i.descripcion || (i.tipo === 'mano_obra' ? 'Mano de obra' : 'Material')}
        </td>
        <td style="padding:9px 12px;color:#6B7280;text-align:center;font-size:13px;">${i.cantidad}</td>
        <td style="padding:9px 12px;color:#6B7280;text-align:right;font-size:13px;">${fmt(i.precio_unit)}</td>
        <td style="padding:9px 12px;color:#1A1A1A;font-weight:700;text-align:right;font-size:13px;">${fmt(i.subtotal || i.cantidad * i.precio_unit)}</td>
      </tr>`
  }).join('')

  return `
    <table style="width:100%;border-collapse:collapse;margin-bottom:4px;">
      <thead>
        <tr style="background:#3D5A3E;">
          <th style="text-align:left;padding:8px 12px;font-size:9px;font-weight:700;color:#fff;letter-spacing:1.5px;text-transform:uppercase;">Descripción</th>
          <th style="text-align:center;padding:8px 12px;font-size:9px;font-weight:700;color:#fff;letter-spacing:1.5px;text-transform:uppercase;width:50px;">Cant.</th>
          <th style="text-align:right;padding:8px 12px;font-size:9px;font-weight:700;color:#fff;letter-spacing:1.5px;text-transform:uppercase;width:100px;">P. Unit.</th>
          <th style="text-align:right;padding:8px 12px;font-size:9px;font-weight:700;color:#fff;letter-spacing:1.5px;text-transform:uppercase;width:100px;">Subtotal</th>
        </tr>
      </thead>
      <tbody>${filas}</tbody>
    </table>`
}

function bloqueSeña(senia_activa, senia_porcentaje, total) {
  if (!senia_activa || !senia_porcentaje || senia_porcentaje <= 0) return ''
  const monto = Math.round(total * senia_porcentaje / 100)
  return `
    <div style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:8px;padding:12px 16px;margin-top:8px;">
      <div style="font-size:12px;font-weight:700;color:#92400E;margin-bottom:2px;">💰 Seña requerida para confirmar (${senia_porcentaje}%)</div>
      <div style="font-size:20px;font-weight:900;color:#92400E;">${fmt(monto)}</div>
    </div>`
}

function bloqueCliente(cliente) {
  const lineas = [
    cliente.telefono  && `☎ ${cliente.telefono}`,
    cliente.email     && `✉ ${cliente.email}`,
    cliente.direccion && `📍 ${cliente.direccion}`,
  ].filter(Boolean).join('&nbsp;&nbsp;·&nbsp;&nbsp;')
  return `
    <div style="background:#f0f4f0;border:1px solid #E2E8E2;border-radius:10px;padding:14px 18px;margin-bottom:20px;display:flex;align-items:center;gap:14px;">
      <div style="width:40px;height:40px;border-radius:50%;background:#3D5A3E;display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:800;color:#fff;flex-shrink:0;">
        ${cliente.nombre.charAt(0).toUpperCase()}
      </div>
      <div>
        <div style="font-weight:800;font-size:15px;color:#1A1A1A;margin-bottom:3px;">${cliente.nombre}</div>
        ${lineas ? `<div style="font-size:11px;color:#6B7280;">${lineas}</div>` : ''}
      </div>
    </div>`
}

function bloqueProfesional(profesional) {
  const lineas = [
    profesional.telefono && `☎ ${profesional.telefono}`,
    profesional.email    && `✉ ${profesional.email}`,
  ].filter(Boolean).join('&nbsp;&nbsp;·&nbsp;&nbsp;')
  return `
    <div style="background:#f0f4f0;border:1px solid #E2E8E2;border-radius:10px;padding:14px 18px;margin-bottom:20px;">
      <div style="font-weight:800;font-size:14px;color:#1A1A1A;margin-bottom:2px;">${profesional.nombre}${profesional.oficio ? `<span style="font-weight:400;color:#5C7A5D;font-size:12px;margin-left:8px;">${profesional.oficio}</span>` : ''}</div>
      ${lineas ? `<div style="font-size:11px;color:#6B7280;">${lineas}</div>` : ''}
    </div>`
}

function bloqueInfo(presupuesto) {
  return `
    <div style="display:flex;gap:24px;margin-bottom:8px;flex-wrap:wrap;">
      <div>
        <div style="font-size:9px;font-weight:700;color:#5C7A5D;letter-spacing:2px;text-transform:uppercase;margin-bottom:2px;">Presupuesto</div>
        <div style="font-size:28px;font-weight:900;color:#3D5A3E;line-height:1;">#${presupuesto.numero}</div>
        ${presupuesto.titulo ? `<div style="font-size:13px;font-weight:700;color:#1A1A1A;margin-top:3px;">${presupuesto.titulo}</div>` : ''}
      </div>
      <div style="margin-left:auto;text-align:right;">
        <div style="font-size:9px;font-weight:700;color:#5C7A5D;letter-spacing:2px;text-transform:uppercase;margin-bottom:2px;">Fecha</div>
        <div style="font-size:13px;font-weight:600;color:#1A1A1A;">${fmtFecha(presupuesto.fecha_emision)}</div>
        <div style="font-size:11px;color:#6B7280;">Validez: ${presupuesto.vigencia_dias || '—'} días</div>
        ${presupuesto.fecha_vence ? `<div style="font-size:11px;color:#6B7280;">Vence: ${fmtFecha(presupuesto.fecha_vence)}</div>` : ''}
      </div>
    </div>`
}

function bloqueTotal(presupuesto) {
  return `
    <div style="background:#3D5A3E;border-radius:8px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;margin-top:12px;">
      <span style="font-weight:700;font-size:13px;color:#fff;letter-spacing:1px;text-transform:uppercase;">Total</span>
      <span style="font-weight:900;font-size:22px;color:#fff;">${fmt(presupuesto.total)}</span>
    </div>
    ${bloqueSeña(presupuesto.senia_activa, presupuesto.senia_porcentaje, presupuesto.total)}`
}

function bloqueFirma(firma_imagen, firma_nombre, fecha_firma) {
  if (!firma_imagen) return ''
  return `
    <div style="margin-top:20px;padding-top:16px;border-top:1px solid #E2E8E2;">
      <div style="font-size:9px;font-weight:700;color:#5C7A5D;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">Firma del cliente</div>
      <div style="border:1px solid #E2E8E2;border-radius:8px;padding:8px;background:#FAFAF8;display:inline-block;">
        <img src="${firma_imagen}" alt="Firma" style="height:60px;max-width:200px;display:block;" />
      </div>
      <div style="margin-top:4px;font-size:11px;font-weight:700;color:#1A1A1A;">${firma_nombre || ''}</div>
      ${fecha_firma ? `<div style="font-size:10px;color:#6B7280;">${new Date(fecha_firma).toLocaleString('es-AR')}</div>` : ''}
    </div>`
}

function layout(header, contenido) {
  return `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:580px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
      <div style="background:#3D5A3E;height:5px;"></div>
      <div style="padding:28px 28px 8px;">
        <h1 style="margin:0 0 4px;font-size:20px;font-weight:800;color:#1A1A1A;">${header.titulo}</h1>
        <p style="margin:0 0 20px;font-size:13px;color:#6B7280;">${header.subtitulo}</p>
      </div>
      <div style="padding:0 28px 28px;">
        ${contenido}
      </div>
      <div style="border-top:1px solid #F3F4F6;padding:14px 28px;background:#FAFAF8;">
        <p style="margin:0;color:#9CA3AF;font-size:11px;text-align:center;">
          App Presupuestos · Soluciones MDP ·
          <a href="https://wa.me/${WA_SOPORTE}" style="color:#9CA3AF;">Soporte</a>
        </p>
      </div>
      <div style="background:#3D5A3E;height:4px;"></div>
    </div>`
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'content-type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ ok: false })

  const { presupuesto, cliente, profesional } = req.body || {}
  if (!presupuesto || !cliente || !profesional)
    return res.status(400).json({ ok: false, error: 'datos_incompletos' })

  const { numero, titulo, firma_nombre } = presupuesto
  // si firma_imagen es base64, subirla al storage y usar URL pública
  let firma_imagen = presupuesto.firma_imagen
  if (firma_imagen?.startsWith('data:image')) {
    const url = await subirFirmaStorage(firma_imagen, numero)
    if (url) firma_imagen = url
    // si falla el upload, firma_imagen queda como base64 (algunos clientes la mostrarán igual)
  }

  // ── Mail al PROFESIONAL ──────────────────────────────────────────────
  const htmlProf = layout(
    { titulo: `🎉 ¡Presupuesto #${numero} aprobado!`, subtitulo: `${cliente.nombre} aceptó y firmó tu presupuesto.` },
    `${bloqueInfo(presupuesto)}
     <hr style="border:none;border-top:1px solid #E2E8E2;margin:16px 0;">
     <div style="font-size:9px;font-weight:700;color:#5C7A5D;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">Cliente</div>
     ${bloqueCliente(cliente)}
     <div style="font-size:9px;font-weight:700;color:#5C7A5D;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">Detalle</div>
     ${tablaItems(presupuesto.items)}
     ${bloqueTotal(presupuesto)}
     ${bloqueFirma(firma_imagen, firma_nombre, null)}
     <div style="text-align:center;margin-top:24px;">
       <a href="${APP_URL}" style="display:inline-block;background:#3D5A3E;color:#fff;padding:12px 28px;border-radius:8px;font-weight:700;font-size:14px;text-decoration:none;">
         Ver en la app →
       </a>
     </div>`
  )

  // ── Mail al CLIENTE ──────────────────────────────────────────────────
  const htmlCli = layout(
    { titulo: `✅ Confirmaste el presupuesto #${numero}`, subtitulo: `Tu aceptación fue registrada. ${profesional.nombre} fue notificado/a.` },
    `${bloqueInfo(presupuesto)}
     <hr style="border:none;border-top:1px solid #E2E8E2;margin:16px 0;">
     <div style="font-size:9px;font-weight:700;color:#5C7A5D;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">Profesional</div>
     ${bloqueProfesional(profesional)}
     <div style="font-size:9px;font-weight:700;color:#5C7A5D;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">Detalle</div>
     ${tablaItems(presupuesto.items)}
     ${bloqueTotal(presupuesto)}
     ${bloqueFirma(firma_imagen, firma_nombre, null)}
     ${profesional.telefono ? `
     <div style="text-align:center;margin-top:24px;">
       <a href="https://wa.me/${profesional.telefono.replace(/\D/g,'')}"
         style="display:inline-block;background:#22C55E;color:#fff;padding:12px 28px;border-radius:8px;font-weight:700;font-size:14px;text-decoration:none;">
         💬 Contactar a ${profesional.nombre}
       </a>
     </div>` : ''}`
  )

  try {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
    }

    const mails = [
      fetch('https://api.resend.com/emails', {
        method: 'POST', headers,
        body: JSON.stringify({
          from: MAIL_FROM,
          to: profesional.email,
          subject: `🎉 Presupuesto #${numero} aprobado por ${cliente.nombre}`,
          html: htmlProf,
        }),
      }),
    ]

    if (cliente.email) {
      mails.push(fetch('https://api.resend.com/emails', {
        method: 'POST', headers,
        body: JSON.stringify({
          from: MAIL_FROM,
          to: cliente.email,
          subject: `✅ Confirmaste el presupuesto #${numero} de ${profesional.nombre}`,
          html: htmlCli,
        }),
      }))
    }

    await Promise.all(mails)
    return res.status(200).json({ ok: true })
  } catch (e) {
    console.error('[mail-aprobado]', e.message)
    return res.status(500).json({ ok: false, error: e.message })
  }
}
