import { supabase } from '../lib/supabase'

const PLANES = [
  {
    key: 'basico', label: 'Básico', precio: '$8.000', periodo: '/mes', color: '#6B7280',
    features: [
      { ok: true,  icon: '📋', texto: 'Hasta 10 presupuestos por mes' },
      { ok: true,  icon: '🏗',  texto: 'Obras ilimitadas' },
      { ok: true,  icon: '👥', texto: 'Clientes ilimitados' },
      { ok: true,  icon: '🔗', texto: 'Link público para cliente' },
      { ok: true,  icon: '📅', texto: 'Agenda de visitas' },
      { ok: false, icon: '📄', texto: 'Exportar PDF' },
      { ok: false, icon: '📋', texto: 'Plantillas por oficio' },
      { ok: false, icon: '📊', texto: 'Estadísticas avanzadas' },
      { ok: false, icon: '✨', texto: 'IA para presupuestar' },
      { ok: false, icon: '💳', texto: 'Cobro online Mercado Pago' },
      { ok: false, icon: '👷', texto: 'Equipo multiusuario' },
    ],
  },
  {
    key: 'profesional', label: 'Profesional', precio: '$15.000', periodo: '/mes', color: '#3B82F6', destacado: true,
    features: [
      { ok: true,  icon: '📋', texto: 'Presupuestos ilimitados' },
      { ok: true,  icon: '🏗',  texto: 'Obras ilimitadas' },
      { ok: true,  icon: '👥', texto: 'Clientes ilimitados' },
      { ok: true,  icon: '🔗', texto: 'Link público para cliente' },
      { ok: true,  icon: '📅', texto: 'Agenda de visitas' },
      { ok: true,  icon: '📄', texto: 'Exportar PDF' },
      { ok: true,  icon: '📋', texto: 'Plantillas por oficio' },
      { ok: true,  icon: '📊', texto: 'Estadísticas avanzadas' },
      { ok: false, icon: '✨', texto: 'IA para presupuestar' },
      { ok: false, icon: '💳', texto: 'Cobro online Mercado Pago' },
      { ok: false, icon: '👷', texto: 'Equipo multiusuario' },
    ],
  },
  {
    key: 'premium', label: 'Premium', precio: '$25.000', periodo: '/mes', color: '#A855F7',
    features: [
      { ok: true, icon: '📋', texto: 'Presupuestos ilimitados' },
      { ok: true, icon: '🏗',  texto: 'Obras ilimitadas' },
      { ok: true, icon: '👥', texto: 'Clientes ilimitados' },
      { ok: true, icon: '🔗', texto: 'Link público para cliente' },
      { ok: true, icon: '📅', texto: 'Agenda de visitas' },
      { ok: true, icon: '📄', texto: 'Exportar PDF' },
      { ok: true, icon: '📋', texto: 'Plantillas por oficio' },
      { ok: true, icon: '📊', texto: 'Estadísticas avanzadas' },
      { ok: true, icon: '✨', texto: 'IA para presupuestar' },
      { ok: true, icon: '💳', texto: 'Cobro online Mercado Pago' },
      { ok: true, icon: '👷', texto: 'Equipo multiusuario' },
    ],
  },
]

export default function SinAcceso({ estado, diasRestantes, email }) {
  const esDemo    = estado === 'demo'
  const esImpago  = estado === 'impago'
  const esSuspend = estado === 'suspendido'

  const titulo = esDemo && diasRestantes > 0
    ? `Tu prueba vence en ${diasRestantes} día${diasRestantes !== 1 ? 's' : ''}`
    : esDemo        ? 'Tu período de prueba venció'
    : esImpago      ? 'Suscripción vencida'
    : esSuspend     ? 'Acceso suspendido'
    : 'Elegí tu plan'

  const subtitulo = esDemo && diasRestantes > 0
    ? 'Activá un plan para seguir usando la app'
    : esImpago      ? 'Registrá tu pago para reactivar el acceso'
    : esSuspend     ? 'Contactá al soporte para resolver el problema'
    : 'Gestioná tus presupuestos, obras y clientes desde el celular'

  const waMsg = encodeURIComponent(
    esImpago  ? `Hola! Quiero regularizar mi suscripción a App-presup. Mi email: ${email}` :
    esSuspend ? `Hola! Mi acceso a App-presup está suspendido. Mi email: ${email}` :
                `Hola! Quiero activar mi suscripción a App-presup. Mi email: ${email}`
  )

  return (
    <div className="flex flex-col pb-12" style={{ background: '#0D0D14', minHeight: '100%' }}>

      {/* header */}
      <div className="flex flex-col items-center pt-14 pb-6 px-5 text-center">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4"
          style={{ background: 'rgba(59,130,246,.15)', border: '1px solid rgba(59,130,246,.3)' }}>
          <span className="text-4xl">🔧</span>
        </div>
        <h1 className="text-white font-bold text-[22px] mb-2">{titulo}</h1>
        <p className="text-gray-400 text-[14px] max-w-xs">{subtitulo}</p>
      </div>

      {/* banner demo activo */}
      {esDemo && diasRestantes > 0 && (
        <div className="mx-4 rounded-2xl p-3 mb-4 text-center"
          style={{ background: 'rgba(251,191,36,.1)', border: '1px solid rgba(251,191,36,.3)' }}>
          <p className="text-yellow-400 font-semibold text-[13px]">
            ⚠️ Te quedan {diasRestantes} día{diasRestantes !== 1 ? 's' : ''} de prueba gratuita
          </p>
        </div>
      )}

      {/* planes */}
      {!esSuspend && (
        <div className="px-4 flex flex-col gap-4 mb-6">
          <p className="text-gray-500 text-[10px] font-semibold tracking-widest text-center">PLANES DISPONIBLES</p>

          {PLANES.map(p => (
            <div key={p.key} className="rounded-2xl overflow-hidden relative"
              style={{
                background: p.destacado ? 'rgba(59,130,246,.08)' : '#161622',
                border: `1px solid ${p.destacado ? '#3B82F6' : '#1E1E2E'}`,
              }}>

              {p.destacado && (
                <div className="text-center py-1.5 text-[11px] font-bold tracking-wide"
                  style={{ background: '#3B82F6', color: '#fff' }}>
                  ⭐ MÁS POPULAR
                </div>
              )}

              <div className="p-4">
                {/* cabecera plan */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-white font-bold text-[18px]">{p.label}</p>
                    <div className="flex items-baseline gap-0.5 mt-0.5">
                      <span className="font-bold text-[24px]" style={{ color: p.color }}>{p.precio}</span>
                      <span className="text-gray-500 text-[12px]">{p.periodo}</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{ background: p.color + '22' }}>
                    <span className="text-2xl">
                      {p.key === 'basico' ? '🔩' : p.key === 'profesional' ? '⚡' : '🚀'}
                    </span>
                  </div>
                </div>

                {/* features */}
                <div className="flex flex-col gap-2">
                  {p.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: f.ok ? p.color + '22' : 'rgba(107,114,128,.1)' }}>
                        <span className="text-[11px]">{f.ok ? '✓' : '✕'}</span>
                      </div>
                      <span className="text-[12px]" style={{ color: f.ok ? '#E5E7EB' : '#4B5563' }}>
                        {f.icon} {f.texto}
                      </span>
                    </div>
                  ))}
                </div>

                {/* botón */}
                <a href={`https://wa.me/5492234000000?text=${encodeURIComponent(`Hola! Quiero el plan ${p.label} de App-presup. Mi email: ${email}`)}`}
                  target="_blank" rel="noreferrer"
                  className="mt-4 block w-full py-3 rounded-2xl text-white font-bold text-[14px] text-center"
                  style={{ background: p.destacado ? p.color : p.color + '33', color: p.destacado ? '#fff' : p.color }}>
                  Quiero el plan {p.label}
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CTA suspendido */}
      {esSuspend && (
        <div className="px-4 mb-6">
          <a href={`https://wa.me/5492234000000?text=${waMsg}`}
            target="_blank" rel="noreferrer"
            className="block w-full py-4 rounded-2xl text-white font-bold text-[15px] text-center"
            style={{ background: '#3B82F6' }}>
            💬 Contactar soporte
          </a>
        </div>
      )}

      <button onClick={() => supabase.auth.signOut()}
        className="text-gray-600 text-[12px] underline text-center mx-auto block">
        Cerrar sesión ({email})
      </button>
    </div>
  )
}
