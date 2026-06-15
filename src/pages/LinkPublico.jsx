import { useParams, useSearchParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { usePresupuestoPublico } from '../lib/usePresupuestos'
import CircleProgress from '../components/ui/CircleProgress'

function fmt(n) { return '$' + Number(n || 0).toLocaleString('es-AR') }

export default function LinkPublico() {
  const { token } = useParams()
  const [searchParams] = useSearchParams()
  const printMode = searchParams.get('print') === '1'
  const { data: p, loading, error, aceptar } = usePresupuestoPublico(token)
  const [aceptando, setAceptando] = useState(false)
  const [aceptado, setAceptado] = useState(false)
  const [errAceptar, setErrAceptar] = useState('')
  const [confirmar, setConfirmar] = useState(false)

  useEffect(() => {
    if (!loading && p && printMode) {
      setTimeout(() => window.print(), 600)
    }
  }, [loading, p, printMode])

  async function handleAceptar() {
    setAceptando(true)
    const result = await aceptar()
    if (result?.ok) setAceptado(true)
    else setErrAceptar(result?.error || 'Error al aceptar')
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
  const vencido = p.fecha_vence && new Date(p.fecha_vence) < new Date()
  const prof = { nombre: p.prof_nombre, oficio: p.prof_oficio, logo_url: p.prof_logo }

  if (aceptado) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 px-6" style={{ background: '#0D0D14' }}>
      <div className="w-24 h-24 rounded-full flex items-center justify-center text-5xl"
        style={{ background: 'rgba(34,197,94,.15)' }}>✅</div>
      <p className="text-white font-bold text-2xl text-center">¡Presupuesto aceptado!</p>
      <p className="text-gray-400 text-sm text-center">
        {prof?.nombre} fue notificado y se pondrá en contacto para coordinar la fecha de inicio.
      </p>
      {prof?.telefono && (
        <a href={`https://wa.me/${prof.telefono.replace(/\D/g, '')}`}
          className="w-full max-w-sm py-4 rounded-2xl text-white font-bold text-center"
          style={{ background: '#22C55E' }}>
          💬 Contactar por WhatsApp
        </a>
      )}
    </div>
  )

  return (
    <div className="min-h-screen pb-8" style={{ background: '#0D0D14' }}>

      {/* header profesional */}
      <div className="px-5 pt-10 pb-6 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3"
          style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
          🔧
        </div>
        <p className="text-white font-bold text-[18px]">{prof?.nombre || 'Profesional'}</p>
        <p className="text-gray-400 text-[13px]">{prof?.oficio || ''}</p>
      </div>

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
        {p.fecha_vence && (
          <div className="rounded-xl px-4 py-3 flex items-center gap-2"
            style={{
              background: vencido ? 'rgba(239,68,68,.1)' : 'rgba(59,130,246,.1)',
              border: `1px solid ${vencido ? 'rgba(239,68,68,.3)' : 'rgba(59,130,246,.3)'}`,
            }}>
            <span>{vencido ? '⏰' : '📅'}</span>
            <span className="text-[12px]" style={{ color: vencido ? '#EF4444' : '#3B82F6' }}>
              {vencido
                ? 'Este presupuesto expiró. Contactá al profesional para actualizar precios.'
                : `Válido hasta el ${new Date(p.fecha_vence).toLocaleDateString('es-AR')}`
              }
            </span>
          </div>
        )}

        {/* ítems */}
        <div className="rounded-2xl p-4" style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
          <p className="text-gray-500 text-[11px] font-semibold tracking-wider mb-3">DETALLE</p>
          <div className="flex flex-col gap-3">
            {(p.items || []).sort((a, b) => a.orden - b.orden).map((item, i) => (
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

        {/* botón aceptar */}
        {p.status === 'enviado' && !vencido && (
          <>
            {errAceptar && <p className="text-red-400 text-xs text-center">{errAceptar}</p>}
            {!confirmar ? (
              <button onClick={() => setConfirmar(true)}
                className="w-full py-5 rounded-2xl text-white font-bold text-[17px]"
                style={{ background: '#22C55E', boxShadow: '0 0 30px rgba(34,197,94,.3)' }}>
                ✅ ACEPTAR PRESUPUESTO
              </button>
            ) : (
              <div className="rounded-2xl p-5 flex flex-col gap-3" style={{ background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.3)' }}>
                <p className="text-white font-bold text-center text-[15px]">¿Confirmás la aceptación?</p>
                <p className="text-gray-400 text-[12px] text-center">Esta acción no se puede deshacer. {prof?.nombre} coordinará el inicio del trabajo.</p>
                <div className="flex gap-3">
                  <button onClick={() => setConfirmar(false)}
                    className="flex-1 py-3 rounded-xl text-gray-400 font-semibold text-[14px]"
                    style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
                    Cancelar
                  </button>
                  <button onClick={handleAceptar} disabled={aceptando}
                    className="flex-1 py-3 rounded-xl text-white font-bold text-[14px] flex items-center justify-center"
                    style={{ background: '#22C55E' }}>
                    {aceptando
                      ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : 'Sí, aceptar'
                    }
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {p.status === 'aprobado' && (
          <div className="rounded-2xl p-4 text-center" style={{ background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.3)' }}>
            <p className="text-green-400 font-bold">✅ Presupuesto ya aceptado</p>
            <p className="text-gray-500 text-[12px] mt-1">Aceptado el {new Date(p.fecha_aprobado).toLocaleDateString('es-AR')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
