import { useParams } from 'react-router-dom'
import { useState, useRef, useCallback } from 'react'
import { usePresupuestoPublico } from '../lib/usePresupuestos'
import CircleProgress from '../components/ui/CircleProgress'
import { supabase } from '../lib/supabase'
import { fmt } from '../lib/fmt'

export default function LinkPublico() {
  const { token } = useParams()
  const { data: p, loading, error, aceptar, rechazar } = usePresupuestoPublico(token)
  const [aceptando, setAceptando] = useState(false)
  const [aceptado, setAceptado] = useState(false)
  const [rechazado, setRechazado] = useState(false)
  const [rechazando, setRechazando] = useState(false)
  const [showConfirmRechazar, setShowConfirmRechazar] = useState(false)
  const [errAceptar, setErrAceptar] = useState('')
  const [showFirma, setShowFirma] = useState(false)
  const [nombreFirma, setNombreFirma] = useState('')

  // canvas firma
  const canvasRef = useRef(null)
  const dibujando = useRef(false)
  const [hasDrawn, setHasDrawn] = useState(false)
  const lastPos = useRef({ x: 0, y: 0 })

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    const src = e.touches ? e.touches[0] : e
    return {
      x: (src.clientX - rect.left) * (canvas.width / rect.width),
      y: (src.clientY - rect.top) * (canvas.height / rect.height),
    }
  }

  const iniciarTrazo = useCallback(e => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    dibujando.current = true
    lastPos.current = getPos(e, canvas)
  }, [])

  const trazar = useCallback(e => {
    e.preventDefault()
    if (!dibujando.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    lastPos.current = pos
    if (!hasDrawn) setHasDrawn(true)
  }, [hasDrawn])

  const terminarTrazo = useCallback(() => { dibujando.current = false }, [])

  function limpiarFirma() {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
  }

  async function confirmarFirma() {
    if (!hasDrawn) return
    setAceptando(true)
    setErrAceptar('')
    const canvas = canvasRef.current
    const firmaBase64 = canvas.toDataURL('image/png')

    // intentar subir firma a Storage para obtener URL pública (usable en emails)
    let firmaUrl = null
    try {
      const blob = await (await fetch(firmaBase64)).blob()
      const path = `firmas/${p.id}_${Date.now()}.png`
      const { data: up } = await supabase.storage.from('firmas').upload(path, blob, { contentType: 'image/png', upsert: true })
      if (up?.path) {
        const { data: pub } = supabase.storage.from('firmas').getPublicUrl(up.path)
        firmaUrl = pub?.publicUrl || null
      }
    } catch (_) {}

    const firmaParaGuardar = firmaUrl || firmaBase64

    const result = await aceptar({ firma_imagen: firmaParaGuardar, firma_nombre: nombreFirma })
    if (result?.ok) {
      setAceptado(true)
      // mails de confirmación — fire & forget
      fetch('/api/mail-aprobado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          presupuesto: {
            numero:           p.numero,
            titulo:           p.titulo,
            total:            p.total,
            fecha_vence:      p.fecha_vence,
            fecha_emision:    p.created_at,
            vigencia_dias:    p.vigencia_dias,
            senia_activa:     p.senia_activa,
            senia_porcentaje: p.senia_porcentaje,
            firma_imagen:     firmaUrl,   // solo URL, no base64 (emails bloquean base64)
            firma_nombre:     nombreFirma || p.cliente_nombre,
            items:            p.items || [],
          },
          cliente: {
            nombre:    p.cliente_nombre || '',
            email:     p.cliente_email || '',
            telefono:  p.cliente_telefono || '',
            direccion: p.cliente_direccion || '',
          },
          profesional: {
            nombre:    p.prof_nombre || '',
            email:     p.prof_email || '',
            telefono:  p.prof_telefono || '',
            oficio:    p.prof_oficio || '',
          },
        }),
      }).catch(() => {})
    } else {
      setErrAceptar(result?.error || 'Error al aceptar. Intentá de nuevo.')
    }
    setAceptando(false)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0D0D14' }}>
      <div className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6" style={{ background: '#0D0D14' }}>
      <span className="text-5xl">😕</span>
      <p className="text-white font-bold text-xl text-center">Presupuesto no encontrado</p>
      <p className="text-gray-500 text-sm text-center">El link puede haber expirado o ser incorrecto.</p>
    </div>
  )

  const cobrado = p.cobrado || 0
  const pct = p.total > 0 ? Math.round((cobrado / p.total) * 100) : 0
  const vencido = p.fecha_vence && new Date(p.fecha_vence + 'T23:59:59') < new Date()
  const prof = {
    nombre:       p.prof_nombre,
    oficio:       p.prof_oficio,
    logo_url:     p.prof_logo,
    telefono:     p.prof_telefono,
    ciudad:       p.prof_ciudad,
    provincia:    p.prof_provincia,
    matricula:    p.prof_matricula,
    cuit:         p.prof_cuit,
    condicion_iva: p.prof_condicion_iva,
  }
  const profInicial = prof.nombre?.charAt(0)?.toUpperCase() || '?'
  const profUbicacion = [prof.ciudad, prof.provincia].filter(Boolean).join(', ')

  async function confirmarRechazar() {
    setRechazando(true)
    const result = await rechazar()
    if (result?.ok) setRechazado(true)
    setRechazando(false)
    setShowConfirmRechazar(false)
  }

  if (rechazado) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 px-6" style={{ background: '#0D0D14' }}>
      <div className="w-24 h-24 rounded-full flex items-center justify-center text-5xl"
        style={{ background: 'rgba(239,68,68,.15)' }}>❌</div>
      <p className="text-white font-bold text-2xl text-center">Presupuesto rechazado</p>
      <p className="text-gray-400 text-sm text-center">
        Se notificó a {prof?.nombre}. Podés contactarlo para ajustar el presupuesto.
      </p>
      {prof?.telefono && (
        <a href={`https://wa.me/54${prof.telefono.replace(/\D/g,'')}`}
          className="w-full max-w-sm py-4 rounded-2xl text-white font-bold text-center"
          style={{ background: '#25D366' }}>
          💬 Contactar por WhatsApp
        </a>
      )}
    </div>
  )

  if (aceptado) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 px-6" style={{ background: '#0D0D14' }}>
      <div className="w-24 h-24 rounded-full flex items-center justify-center text-5xl"
        style={{ background: 'rgba(34,197,94,.15)' }}>✅</div>
      <p className="text-white font-bold text-2xl text-center">¡Presupuesto aceptado!</p>
      <p className="text-gray-400 text-sm text-center">
        {prof?.nombre} fue notificado y se pondrá en contacto para coordinar la fecha de inicio.
      </p>
      {prof?.telefono && (
        <a href={`https://wa.me/${prof.telefono.replace(/\D/g,'')}`}
          className="w-full max-w-sm py-4 rounded-2xl text-white font-bold text-center"
          style={{ background: '#22C55E' }}>
          💬 Contactar por WhatsApp
        </a>
      )}
    </div>
  )

  return (
    <div className="min-h-screen pb-40" style={{ background: '#0D0D14' }}>

      {/* header profesional */}
      <div className="px-5 pt-10 pb-6">
        <div className="flex items-center gap-4">
          {/* avatar / logo */}
          {prof.logo_url ? (
            <img src={prof.logo_url} alt={prof.nombre}
              className="w-16 h-16 rounded-2xl object-cover shrink-0"
              style={{ border: '1px solid #2A2A3A' }} />
          ) : (
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shrink-0"
              style={{ background: '#3B82F6' }}>
              {profInicial}
            </div>
          )}
          {/* datos */}
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-[18px] leading-tight">{prof.nombre || 'Profesional'}</p>
            {prof.oficio && <p className="text-blue-400 text-[13px] font-medium mt-0.5">{prof.oficio}</p>}
            {profUbicacion && <p className="text-gray-500 text-[12px] mt-0.5">📍 {profUbicacion}</p>}
            {prof.telefono && (
              <a href={`https://wa.me/54${prof.telefono.replace(/\D/g,'')}`}
                target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 mt-1.5 text-[12px] font-medium px-2.5 py-1 rounded-lg"
                style={{ background: 'rgba(37,211,102,.12)', color: '#25D366' }}>
                <span>💬</span> {prof.telefono}
              </a>
            )}
          </div>
        </div>
        {/* datos fiscales si tiene */}
        {(prof.matricula || prof.cuit) && (
          <div className="flex gap-4 mt-4 px-1">
            {prof.matricula && (
              <div>
                <p className="text-gray-600 text-[10px]">Matrícula</p>
                <p className="text-gray-400 text-[12px] font-medium">{prof.matricula}</p>
              </div>
            )}
            {prof.cuit && (
              <div>
                <p className="text-gray-600 text-[10px]">CUIT</p>
                <p className="text-gray-400 text-[12px] font-medium">{prof.cuit}</p>
              </div>
            )}
            {prof.condicion_iva && (
              <div>
                <p className="text-gray-600 text-[10px]">IVA</p>
                <p className="text-gray-400 text-[12px] font-medium capitalize">{prof.condicion_iva.replace('_', ' ')}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* divider */}
      <div className="mx-4 mb-4 h-px" style={{ background: '#1E1E2E' }} />

      <div className="px-4 flex flex-col gap-4 max-w-md mx-auto">

        {/* estado y total */}
        <div className="rounded-2xl p-5" style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-gray-500 text-[11px]">Presupuesto #{p.numero}</p>
              {p.titulo && <p className="text-blue-400 font-semibold text-[14px] mb-1">{p.titulo}</p>}
              <p className="text-white font-bold text-[30px]">{fmt(p.total)}</p>
            </div>
            <div className="relative">
              <CircleProgress pct={pct} size={72} stroke={6} color="#22C55E" />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-white font-bold text-[14px]">{pct}%</span>
                <span className="text-gray-500 text-[9px]">cobrado</span>
              </div>
            </div>
          </div>
          <div className="flex gap-4">
            <div>
              <p className="text-gray-500 text-[10px]">Materiales</p>
              <p className="text-blue-400 font-semibold text-[13px]">{fmt(p.total_materiales)}</p>
            </div>
            <div>
              <p className="text-gray-500 text-[10px]">Mano de obra</p>
              <p className="text-orange-400 font-semibold text-[13px]">{fmt(p.total_mano_obra)}</p>
            </div>
          </div>
        </div>

        {/* vigencia */}
        {p.fecha_vence && (() => {
          const hoy = new Date(); hoy.setHours(0,0,0,0)
          const vence = new Date(p.fecha_vence + 'T00:00:00')
          const diasRestantes = Math.ceil((vence - hoy) / 86400000)
          const urgente = !vencido && diasRestantes <= 2
          const color = vencido ? '#EF4444' : urgente ? '#F97316' : '#3B82F6'
          const bgColor = vencido ? 'rgba(239,68,68,.1)' : urgente ? 'rgba(249,115,22,.1)' : 'rgba(59,130,246,.1)'
          const borderColor = vencido ? 'rgba(239,68,68,.3)' : urgente ? 'rgba(249,115,22,.3)' : 'rgba(59,130,246,.3)'
          return (
            <div className="rounded-xl px-4 py-3 flex items-center justify-between gap-2"
              style={{ background: bgColor, border: `1px solid ${borderColor}` }}>
              <div className="flex items-center gap-2">
                <span>{vencido ? '⏰' : urgente ? '⚠️' : '📅'}</span>
                <span className="text-[12px]" style={{ color }}>
                  {vencido
                    ? 'Este presupuesto expiró. Contactá al profesional.'
                    : `Válido hasta el ${vence.toLocaleDateString('es-AR')}`}
                </span>
              </div>
              {!vencido && (
                <span className="text-[11px] font-bold shrink-0 px-2 py-0.5 rounded-full"
                  style={{ background: color + '22', color }}>
                  {diasRestantes === 0 ? '¡Hoy vence!' : diasRestantes === 1 ? 'Queda 1 día' : `Quedan ${diasRestantes} días`}
                </span>
              )}
            </div>
          )
        })()}

        {/* ítems */}
        <div className="rounded-2xl p-4" style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
          <p className="text-gray-500 text-[11px] font-semibold tracking-wider mb-3">DETALLE</p>
          <div className="flex flex-col gap-3">
            {(p.items || []).sort((a, b) => a.orden - b.orden).map((item, i) => item.tipo === 'seccion' ? (
              <div key={i} className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-px" style={{ background: '#2A2A3A' }} />
                <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ color: '#A855F7', background: 'rgba(168,85,247,.1)' }}>
                  📌 {item.descripcion}
                </span>
                <div className="flex-1 h-px" style={{ background: '#2A2A3A' }} />
              </div>
            ) : (
              <div key={i} className="flex items-center gap-3">
                <span className="text-lg shrink-0">{item.tipo === 'material' ? '🔧' : '👷'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-[13px] truncate">{item.descripcion}</p>
                  <p className="text-gray-500 text-[10px]">{item.cantidad} {item.unidad} × {fmt(item.precio_unit)}</p>
                </div>
                <p className="text-white font-semibold text-[13px] shrink-0">{fmt(item.subtotal)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* cartel de seña (siempre visible si aplica) */}
        {p.status === 'enviado' && !vencido && p.senia_activa && p.senia_porcentaje > 0 && (
          <div className="rounded-2xl px-4 py-3 flex items-center gap-3" style={{ background: 'rgba(234,179,8,.08)', border: '1px solid rgba(234,179,8,.25)' }}>
            <span className="text-2xl">💰</span>
            <div>
              <p className="text-yellow-400 font-bold text-[13px]">Seña para confirmar el trabajo</p>
              <p className="text-white font-bold text-[18px] leading-tight">
                {fmt(Math.round(p.total * p.senia_porcentaje / 100))}
                <span className="text-gray-500 font-normal text-[12px] ml-2">({p.senia_porcentaje}%)</span>
              </p>
            </div>
          </div>
        )}

        {/* botón aceptar / panel firma */}
        {p.status === 'enviado' && !vencido && (
          <>
            {errAceptar && <p className="text-red-400 text-xs text-center">{errAceptar}</p>}

            {/* botón rechazar inline */}
            <button onClick={() => setShowConfirmRechazar(true)}
              className="w-full py-3 rounded-2xl font-semibold text-[14px]"
              style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', color: '#EF4444' }}>
              ✕ No aceptar este presupuesto
            </button>

            {/* bottom sheet firma (se abre al tocar el botón fijo de abajo) */}
            {showFirma && (
              <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: 'rgba(0,0,0,.6)' }}
                onClick={() => { setShowFirma(false); limpiarFirma() }}>
                <div className="rounded-t-3xl p-5 flex flex-col gap-4 w-full max-w-lg mx-auto"
                  style={{ background: '#161622' }}
                  onClick={e => e.stopPropagation()}>

                  <div className="w-10 h-1 rounded-full mx-auto" style={{ background: '#2A2A3A' }} />
                  <p className="text-white font-bold text-[16px] text-center">Confirmación de aceptación</p>

                  {/* nombre editable */}
                  <div>
                    <p className="text-gray-500 text-[11px] mb-1.5">Tu nombre completo</p>
                    <input
                      value={nombreFirma}
                      onChange={e => setNombreFirma(e.target.value)}
                      placeholder="Escribí tu nombre"
                      className="w-full rounded-xl px-4 py-3 text-white text-[14px] font-semibold outline-none"
                      style={{ background: '#0D0D14', border: `1px solid ${nombreFirma ? '#3B82F6' : '#2A2A3A'}` }}
                    />
                  </div>

                  {/* canvas firma */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-gray-500 text-[11px]">Firma con el dedo</p>
                      {hasDrawn && (
                        <button onClick={limpiarFirma} className="text-[11px]" style={{ color: '#EF4444' }}>
                          Limpiar
                        </button>
                      )}
                    </div>
                    <div className="rounded-xl overflow-hidden relative" style={{ background: '#fff', border: '2px solid #3B82F6' }}>
                      <canvas
                        ref={canvasRef}
                        width={600}
                        height={180}
                        style={{ width: '100%', height: 140, touchAction: 'none', display: 'block' }}
                        onMouseDown={iniciarTrazo}
                        onMouseMove={trazar}
                        onMouseUp={terminarTrazo}
                        onMouseLeave={terminarTrazo}
                        onTouchStart={iniciarTrazo}
                        onTouchMove={trazar}
                        onTouchEnd={terminarTrazo}
                      />
                      {!hasDrawn && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <p style={{ color: '#bbb', fontSize: 13 }}>✍️ Firmá acá</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-gray-600 text-[10px] text-center leading-relaxed">
                    Al confirmar, {nombreFirma || 'el cliente'} acepta el presupuesto #{p.numero} por {fmt(p.total)} presentado por {prof?.nombre}. Queda registrado con fecha y hora.
                  </p>

                  <div className="flex gap-3 pb-2">
                    <button onClick={() => { setShowFirma(false); limpiarFirma() }}
                      className="flex-1 py-3 rounded-xl text-gray-400 font-semibold text-[14px]"
                      style={{ background: '#0D0D14', border: '1px solid #1E1E2E' }}>
                      Cancelar
                    </button>
                    <button onClick={confirmarFirma} disabled={!hasDrawn || !nombreFirma.trim() || aceptando}
                      className="flex-1 py-3 rounded-xl text-white font-bold text-[14px] flex items-center justify-center disabled:opacity-40"
                      style={{ background: '#22C55E' }}>
                      {aceptando
                        ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        : '✓ Confirmar'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* modal confirmación rechazo */}
            {showConfirmRechazar && (
              <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: 'rgba(0,0,0,.7)' }}
                onClick={() => setShowConfirmRechazar(false)}>
                <div className="rounded-t-3xl p-6 flex flex-col gap-4" style={{ background: '#161622' }}
                  onClick={e => e.stopPropagation()}>
                  <div className="w-10 h-1 rounded-full mx-auto" style={{ background: '#2A2A3A' }} />
                  <p className="text-white font-bold text-[17px] text-center">¿Rechazar presupuesto?</p>
                  <p className="text-gray-400 text-[13px] text-center">
                    Se le avisará a {prof?.nombre} que no aceptaste el presupuesto #{p.numero}.
                  </p>
                  <div className="flex gap-3 pb-2">
                    <button onClick={() => setShowConfirmRechazar(false)}
                      className="flex-1 py-3 rounded-xl text-gray-400 font-semibold"
                      style={{ background: '#0D0D14', border: '1px solid #1E1E2E' }}>
                      Cancelar
                    </button>
                    <button onClick={confirmarRechazar} disabled={rechazando}
                      className="flex-1 py-3 rounded-xl text-white font-bold flex items-center justify-center disabled:opacity-50"
                      style={{ background: '#EF4444' }}>
                      {rechazando
                        ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        : 'Sí, rechazar'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

      </div>

      {/* ─── BOTÓN FIJO AL FONDO ─── */}
      {p.status === 'enviado' && !vencido && (
        <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-6 pt-3"
          style={{ background: 'linear-gradient(to top, #0D0D14 70%, transparent)' }}>
          <button onClick={() => { setNombreFirma(p.cliente_nombre || ''); setShowFirma(true) }}
            className="w-full py-5 rounded-2xl text-white font-bold text-[17px] max-w-md mx-auto block"
            style={{ background: '#22C55E', boxShadow: '0 0 30px rgba(34,197,94,.4)' }}>
            ✅ ACEPTAR PRESUPUESTO
          </button>
        </div>
      )}

      {/* contenido aprobado (reemplaza la sección de abajo cuando está aprobado) */}
      <div className="px-4 max-w-md mx-auto">
        {p.status === 'aprobado' && (
          <div className="rounded-2xl p-5 text-center" style={{ background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.3)' }}>
            <p className="text-green-400 font-bold text-[15px]">✅ Presupuesto aceptado</p>
            {p.firma_nombre && <p className="text-gray-400 text-[12px] mt-1">Firmado por {p.firma_nombre}</p>}
            {p.firma_fecha && <p className="text-gray-500 text-[11px]">{new Date(p.firma_fecha).toLocaleString('es-AR')}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
