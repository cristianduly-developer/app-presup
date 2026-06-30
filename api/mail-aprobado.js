const MAIL_FROM    = 'App Presupuestos <noreply@solucionesmdp.com.ar>'
const MAIL_ADMIN   = 'cristianduly@gmail.com'
const APP_URL      = 'https://presupuestos.solucionesmdp.com.ar'
const WA_SOPORTE   = '5492235767784'

function fmt(n) {
  return '$' + Number(n || 0).toLocaleString('es-AR')
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'content-type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ ok: false })

  const { presupuesto, cliente, profesional } = req.body || {}
  if (!presupuesto || !cliente || !profesional) {
    return res.status(400).json({ ok: false, error: 'datos_incompletos' })
  }

  const { numero, titulo, total, fecha_vence, items = [] } = presupuesto
  const itemsHTML = items.filter(i => i.tipo !== 'seccion').map(i => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#374151;">
        ${i.descripcion || (i.tipo === 'mano_obra' ? 'Mano de obra' : 'Material')}
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#6B7280;text-align:right;">
        ${fmt(i.cantidad * i.precio_unit)}
      </td>
    </tr>`).join('')

  // ── Mail al cliente ───────────────────────────────────────────────
  const htmlCliente = `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;">
      <div style="background:#1D4ED8;padding:32px 28px;text-align:center;">
        <div style="font-size:38px;margin-bottom:10px;">✅</div>
        <h1 style="color:#fff;margin:0 0 6px;font-size:22px;font-weight:800;">¡Presupuesto aceptado!</h1>
        <p style="color:rgba(255,255,255,.85);margin:0;font-size:14px;">Tu confirmación fue registrada correctamente</p>
      </div>
      <div style="padding:32px 28px;">
        <p style="color:#374151;font-size:15px;margin:0 0 24px;">Hola <strong>${cliente.nombre}</strong>, confirmamos que aceptaste el presupuesto de <strong>${profesional.nombre}</strong>.</p>

        <div style="background:#F9FAFB;border-radius:10px;padding:20px;margin-bottom:24px;border:1px solid #F3F4F6;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <div>
              <div style="font-size:11px;color:#9CA3AF;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Presupuesto</div>
              <div style="font-size:22px;font-weight:900;color:#1D4ED8;">#${numero}${titulo ? ' · ' + titulo : ''}</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:11px;color:#9CA3AF;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Total</div>
              <div style="font-size:24px;font-weight:900;color:#111827;">${fmt(total)}</div>
            </div>
          </div>

          ${itemsHTML ? `<table style="width:100%;border-collapse:collapse;font-size:13px;">
            <tbody>${itemsHTML}</tbody>
          </table>` : ''}
        </div>

        <div style="background:#F0FDF4;border-radius:10px;padding:16px 20px;margin-bottom:24px;border:1px solid #BBF7D0;">
          <p style="margin:0 0 8px;font-weight:700;color:#14532D;font-size:13px;">¿Qué pasa ahora?</p>
          <p style="margin:0 0 6px;color:#166534;font-size:13px;">✅ ${profesional.nombre} ya fue notificado/a</p>
          <p style="margin:0 0 6px;color:#166534;font-size:13px;">📞 Te contactará para coordinar el inicio del trabajo</p>
          ${fecha_vence ? '' : ''}
        </div>

        ${profesional.telefono ? `
        <div style="text-align:center;">
          <a href="https://wa.me/${profesional.telefono.replace(/\D/g,'')}"
            style="display:inline-block;background:#22C55E;color:#fff;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none;">
            💬 Contactar a ${profesional.nombre}
          </a>
        </div>` : ''}
      </div>
      <div style="border-top:1px solid #F3F4F6;padding:18px 28px;text-align:center;">
        <p style="margin:0;color:#9CA3AF;font-size:11px;">
          App Presupuestos · Soluciones MDP ·
          <a href="https://wa.me/${WA_SOPORTE}" style="color:#9CA3AF;">Soporte</a>
        </p>
      </div>
    </div>`

  // ── Mail al profesional ───────────────────────────────────────────
  const htmlProfesional = `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;">
      <div style="background:#16A34A;padding:32px 28px;text-align:center;">
        <div style="font-size:38px;margin-bottom:10px;">🎉</div>
        <h1 style="color:#fff;margin:0 0 6px;font-size:22px;font-weight:800;">¡Presupuesto aprobado!</h1>
        <p style="color:rgba(255,255,255,.85);margin:0;font-size:14px;">${cliente.nombre} aceptó tu presupuesto</p>
      </div>
      <div style="padding:32px 28px;">
        <div style="background:#F9FAFB;border-radius:10px;padding:20px;margin-bottom:24px;border:1px solid #F3F4F6;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
            <div>
              <div style="font-size:11px;color:#9CA3AF;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Presupuesto</div>
              <div style="font-size:22px;font-weight:900;color:#1D4ED8;">#${numero}${titulo ? ' · ' + titulo : ''}</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:11px;color:#9CA3AF;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Total</div>
              <div style="font-size:24px;font-weight:900;color:#16A34A;">${fmt(total)}</div>
            </div>
          </div>
          <div style="padding-top:12px;border-top:1px solid #F3F4F6;font-size:13px;color:#6B7280;">
            <strong style="color:#374151;">Cliente:</strong> ${cliente.nombre}
            ${cliente.telefono ? ` · <a href="https://wa.me/${cliente.telefono.replace(/\D/g,'')}" style="color:#16A34A;font-weight:700;">WhatsApp</a>` : ''}
            ${cliente.email ? ` · ${cliente.email}` : ''}
          </div>
        </div>

        <div style="text-align:center;">
          <a href="${APP_URL}"
            style="display:inline-block;background:#1D4ED8;color:#fff;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;">
            Ver en App Presupuestos →
          </a>
        </div>
      </div>
      <div style="border-top:1px solid #F3F4F6;padding:18px 28px;text-align:center;">
        <p style="margin:0;color:#9CA3AF;font-size:11px;">App Presupuestos · Soluciones MDP</p>
      </div>
    </div>`

  try {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
    }

    const mails = [
      // al profesional siempre
      fetch('https://api.resend.com/emails', {
        method: 'POST', headers,
        body: JSON.stringify({
          from: MAIL_FROM,
          to: profesional.email,
          subject: `🎉 ¡Presupuesto #${numero} aprobado por ${cliente.nombre}!`,
          html: htmlProfesional,
        }),
      }),
    ]

    // al cliente solo si tiene email
    if (cliente.email) {
      mails.push(fetch('https://api.resend.com/emails', {
        method: 'POST', headers,
        body: JSON.stringify({
          from: MAIL_FROM,
          to: cliente.email,
          subject: `✅ Confirmación: aceptaste el presupuesto #${numero} de ${profesional.nombre}`,
          html: htmlCliente,
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
