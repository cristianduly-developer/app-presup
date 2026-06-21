import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { useAuth } from '../lib/useAuth'

const OFICIOS = [
  { emoji: '⚡', label: 'Electricista' },
  { emoji: '🔧', label: 'Plomero' },
  { emoji: '🎨', label: 'Pintor' },
  { emoji: '🏗', label: 'Constructor' },
  { emoji: '🪵', label: 'Carpintero' },
  { emoji: '🔥', label: 'Gasista' },
  { emoji: '❄️', label: 'Aire acondicionado' },
  { emoji: '🪟', label: 'Herrero / Aluminio' },
  { emoji: '🛁', label: 'Sanitarista' },
  { emoji: '🏠', label: 'Techista' },
  { emoji: '📐', label: 'Arquitecto' },
  { emoji: '🪚', label: 'Carpintería fina' },
  { emoji: '🧱', label: 'Albañil' },
  { emoji: '🌿', label: 'Paisajista' },
  { emoji: '🔩', label: 'Instalaciones' },
  { emoji: '💡', label: 'Otro' },
]

const TOTAL = 4

export default function Onboarding({ nombre, diasRestantes, onFinalizar }) {
  const { user, actualizarPerfil } = useAuth()
  const [slide, setSlide] = useState(0)
  const [guardando, setGuardando] = useState(false)

  // datos del perfil
  const [nombreVal, setNombreVal] = useState(
    user?.user_metadata?.full_name || ''
  )
  const [telefono, setTelefono] = useState('')
  const [ciudad, setCiudad] = useState('')
  const [oficio, setOficio] = useState('')

  const esUltimo = slide === TOTAL - 1

  async function avanzar() {
    if (slide === 1) {
      // guardar datos personales (sin bloquear)
      actualizarPerfil({ nombre: nombreVal.trim(), telefono: telefono.trim(), ciudad: ciudad.trim() })
        .catch(() => {})
    }
    if (slide === 2 && oficio) {
      actualizarPerfil({ oficio }).catch(() => {})
    }
    if (esUltimo) {
      onFinalizar()
      return
    }
    setSlide(s => s + 1)
  }

  return (
    <div className="flex flex-col h-full" style={{ background: '#0D0D14' }}>
      {/* dots */}
      <div className="flex items-center justify-between px-6 pt-14 pb-6">
        <div className="flex gap-2">
          {Array.from({ length: TOTAL }).map((_, i) => (
            <div key={i} className="h-1.5 rounded-full transition-all duration-300"
              style={{ width: i === slide ? 28 : 8, background: i === slide ? '#3B82F6' : '#2A2A3A' }} />
          ))}
        </div>
        {!esUltimo && (
          <button onClick={onFinalizar} className="text-gray-600 text-[13px] underline">
            Saltar
          </button>
        )}
      </div>

      {/* SLIDE 0 — Bienvenida */}
      {slide === 0 && (
        <div className="flex-1 flex flex-col px-6 overflow-y-auto pb-4">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6"
              style={{ background: 'rgba(59,130,246,.12)', border: '1px solid rgba(59,130,246,.25)' }}>
              <span className="text-5xl">👋</span>
            </div>
            <h1 className="text-white font-bold text-[26px] leading-tight mb-2">
              ¡Hola, {nombre}!
            </h1>
            <p className="text-gray-400 text-[14px] max-w-xs">
              Tu acceso está activo. Te damos la bienvenida a App Presup.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="rounded-2xl px-5 py-4 flex items-center gap-4"
              style={{ background: 'rgba(59,130,246,.12)', border: '1px solid rgba(59,130,246,.3)' }}>
              <span className="text-3xl">🎯</span>
              <div>
                <p className="text-blue-400 font-bold text-[15px]">Plan Profesional — Demo</p>
                <p className="text-gray-400 text-[13px]">
                  {diasRestantes != null
                    ? `${diasRestantes} días de prueba gratis`
                    : '28 días de prueba gratis'}
                </p>
              </div>
            </div>
            <div className="rounded-2xl px-5 py-3 flex items-center gap-3"
              style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
              <span className="text-xl">✅</span>
              <p className="text-gray-300 text-[13px]">Sin tarjeta de crédito requerida</p>
            </div>
            <div className="rounded-2xl px-5 py-3 flex items-center gap-3"
              style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
              <span className="text-xl">🔓</span>
              <p className="text-gray-300 text-[13px]">Acceso completo a todas las funciones</p>
            </div>
          </div>
        </div>
      )}

      {/* SLIDE 1 — Datos personales */}
      {slide === 1 && (
        <div className="flex-1 flex flex-col px-6 overflow-y-auto pb-4">
          <div className="flex flex-col items-center text-center mb-7">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
              style={{ background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.25)' }}>
              <span className="text-4xl">👤</span>
            </div>
            <h1 className="text-white font-bold text-[24px] mb-1">Contanos sobre vos</h1>
            <p className="text-gray-400 text-[13px] max-w-xs">
              Estos datos aparecen en tus presupuestos y PDFs.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Campo label="Nombre completo o empresa *" value={nombreVal} onChange={setNombreVal} placeholder="Ej: Juan Pérez / Electricidad JP" />
            <Campo label="WhatsApp / Teléfono" value={telefono} onChange={setTelefono} placeholder="Ej: 11 2345-6789" type="tel" />
            <Campo label="Ciudad" value={ciudad} onChange={setCiudad} placeholder="Ej: Buenos Aires, Córdoba..." />
          </div>
          <p className="text-gray-600 text-[11px] text-center mt-4">
            Podés completar más datos después en Configuración
          </p>
        </div>
      )}

      {/* SLIDE 2 — Oficio */}
      {slide === 2 && (
        <div className="flex-1 flex flex-col px-6 overflow-y-auto pb-4">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
              style={{ background: 'rgba(249,115,22,.1)', border: '1px solid rgba(249,115,22,.25)' }}>
              <span className="text-4xl">🔨</span>
            </div>
            <h1 className="text-white font-bold text-[24px] mb-1">¿Cuál es tu oficio?</h1>
            <p className="text-gray-400 text-[13px]">
              Lo usamos para sugerirte plantillas de presupuesto.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {OFICIOS.map(o => (
              <button key={o.label} onClick={() => setOficio(o.label)}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all"
                style={{
                  background: oficio === o.label ? 'rgba(59,130,246,.15)' : '#161622',
                  border: oficio === o.label ? '1px solid #3B82F6' : '1px solid #1E1E2E',
                }}>
                <span className="text-[22px]">{o.emoji}</span>
                <span className="text-[12px] font-semibold leading-tight"
                  style={{ color: oficio === o.label ? '#3B82F6' : '#9CA3AF' }}>
                  {o.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* SLIDE 3 — Listo */}
      {slide === 3 && (
        <div className="flex-1 flex flex-col px-6 overflow-y-auto pb-4">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6"
              style={{ background: 'rgba(168,85,247,.1)', border: '1px solid rgba(168,85,247,.25)' }}>
              <span className="text-5xl">🚀</span>
            </div>
            <h1 className="text-white font-bold text-[26px] mb-2">¡Todo listo!</h1>
            <p className="text-gray-400 text-[14px] max-w-xs">
              Empezá creando tu primer presupuesto — tarda menos de 2 minutos.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="rounded-2xl px-5 py-4 text-center"
              style={{ background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.2)' }}>
              <p className="text-green-400 font-bold text-[14px] mb-1">Tu prueba vence en</p>
              <p className="text-white font-bold text-[48px] leading-none">{diasRestantes ?? 28}</p>
              <p className="text-gray-500 text-[13px] mt-1">días</p>
            </div>
            <div className="rounded-2xl px-4 py-3 flex items-center gap-3"
              style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
              <span className="text-xl">🔔</span>
              <p className="text-gray-300 text-[13px]">
                Te avisamos cuando queden 5 días para que no pierdas tus datos
              </p>
            </div>
            <div className="rounded-2xl px-4 py-3 flex items-center gap-3"
              style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
              <span className="text-xl">💬</span>
              <p className="text-gray-300 text-[13px]">
                Para activar tu plan o consultas, contactanos por WhatsApp
              </p>
            </div>
          </div>
        </div>
      )}

      {/* botón */}
      <div className="px-6 pb-10 pt-4 shrink-0">
        <button
          onClick={avanzar}
          disabled={guardando || (slide === 1 && !nombreVal.trim())}
          className="w-full py-4 rounded-2xl text-white font-bold text-[16px] flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)', boxShadow: '0 4px 20px rgba(59,130,246,.4)' }}>
          {esUltimo
            ? '🚀 Ir a mi panel'
            : slide === 2 && !oficio
              ? <><span className="opacity-70">Seleccioná un oficio</span></>
              : <>Siguiente <ChevronRight size={18} /></>}
        </button>
        {slide === 2 && !oficio && (
          <button onClick={avanzar} className="w-full text-center text-gray-600 text-[12px] mt-3 underline">
            Saltar este paso
          </button>
        )}
      </div>
    </div>
  )
}

function Campo({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="text-gray-500 text-[11px] block mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl px-4 py-3.5 text-white text-[14px] outline-none"
        style={{ background: '#161622', border: '1px solid #1E1E2E' }}
      />
    </div>
  )
}
