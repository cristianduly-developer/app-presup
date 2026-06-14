import { supabase } from '../lib/supabase'

const PLANES = [
  { key: 'basico',      label: 'Básico',       precio: '$8.000/mes',  features: ['Hasta 10 presupuestos/mes', 'Obras y clientes ilimitados', 'Link público para clientes'], color: '#6B7280' },
  { key: 'profesional', label: 'Profesional',  precio: '$15.000/mes', features: ['Presupuestos ilimitados', 'Exportar PDF', 'Plantillas por oficio', 'Estadísticas avanzadas'], color: '#3B82F6', destacado: true },
  { key: 'premium',     label: 'Premium',      precio: '$25.000/mes', features: ['Todo lo anterior', 'IA para presupuestar', 'Cobro online Mercado Pago', 'Equipo multiusuario'], color: '#A855F7' },
]

export default function SinAcceso({ estado, diasRestantes, email }) {
  const esDemo    = estado === 'demo'
  const esImpago  = estado === 'impago'
  const esSuspend = estado === 'suspendido'

  const titulo = esDemo && diasRestantes > 0
    ? `Tu período de prueba vence en ${diasRestantes} día${diasRestantes !== 1 ? 's' : ''}`
    : esDemo
    ? 'Tu período de prueba venció'
    : esImpago
    ? 'Suscripción vencida'
    : esSuspend
    ? 'Acceso suspendido'
    : 'Sin acceso'

  const subtitulo = esDemo && diasRestantes > 0
    ? 'Activá tu plan para seguir usando la app sin interrupciones'
    : esImpago
    ? 'Registrá tu pago para reactivar el acceso'
    : esSuspend
    ? 'Contactá al soporte para resolver el problema'
    : 'Tu cuenta no tiene una suscripción activa para App-presup'

  return (
    <div className="flex flex-col min-h-full items-center justify-start pt-16 px-5 pb-12"
      style={{ background: '#0D0D14' }}>

      {/* ícono */}
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4"
        style={{ background: 'rgba(59,130,246,.15)', border: '1px solid rgba(59,130,246,.3)' }}>
        <span className="text-4xl">🔧</span>
      </div>

      <h1 className="text-white font-bold text-[22px] text-center mb-2">{titulo}</h1>
      <p className="text-gray-400 text-[14px] text-center mb-8 max-w-xs">{subtitulo}</p>

      {/* banner demo activo */}
      {esDemo && diasRestantes > 0 && (
        <div className="w-full rounded-2xl p-4 mb-6 text-center"
          style={{ background: 'rgba(251,191,36,.1)', border: '1px solid rgba(251,191,36,.3)' }}>
          <p className="text-yellow-400 font-semibold text-[13px]">
            ⚠️ Tenés {diasRestantes} día{diasRestantes !== 1 ? 's' : ''} de demo restantes
          </p>
        </div>
      )}

      {/* planes */}
      {!esSuspend && (
        <>
          <p className="text-gray-500 text-[11px] font-semibold tracking-widest mb-4">ELEGÍ TU PLAN</p>
          <div className="flex flex-col gap-3 w-full mb-8">
            {PLANES.map(p => (
              <div key={p.key} className="rounded-2xl p-4 relative"
                style={{
                  background: p.destacado ? `rgba(59,130,246,.1)` : '#161622',
                  border: `1px solid ${p.destacado ? '#3B82F6' : '#1E1E2E'}`,
                }}>
                {p.destacado && (
                  <span className="absolute -top-2.5 left-4 text-[10px] font-bold px-3 py-0.5 rounded-full"
                    style={{ background: '#3B82F6', color: '#fff' }}>MÁS POPULAR</span>
                )}
                <div className="flex items-start justify-between mb-2">
                  <p className="text-white font-bold text-[16px]">{p.label}</p>
                  <p className="font-bold text-[15px]" style={{ color: p.color }}>{p.precio}</p>
                </div>
                <div className="flex flex-col gap-1">
                  {p.features.map(f => (
                    <div key={f} className="flex items-center gap-2">
                      <span className="text-[11px]" style={{ color: p.color }}>✓</span>
                      <span className="text-gray-400 text-[12px]">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* CTA WhatsApp */}
          <a href={`https://wa.me/5492234000000?text=${encodeURIComponent(`Hola! Quiero activar mi suscripción a App-presup. Mi email es: ${email}`)}`}
            target="_blank" rel="noreferrer"
            className="w-full py-4 rounded-2xl text-white font-bold text-[15px] text-center block mb-3"
            style={{ background: '#22C55E' }}>
            💬 Activar por WhatsApp
          </a>
        </>
      )}

      {esSuspend && (
        <a href={`https://wa.me/5492234000000?text=${encodeURIComponent(`Hola! Mi acceso a App-presup aparece suspendido. Mi email es: ${email}`)}`}
          target="_blank" rel="noreferrer"
          className="w-full py-4 rounded-2xl text-white font-bold text-[15px] text-center block mb-3"
          style={{ background: '#3B82F6' }}>
          💬 Contactar soporte
        </a>
      )}

      <button onClick={() => supabase.auth.signOut()}
        className="text-gray-600 text-[13px] underline">
        Cerrar sesión
      </button>
    </div>
  )
}
