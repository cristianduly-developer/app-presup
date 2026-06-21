import { useState } from 'react'
import { ChevronRight } from 'lucide-react'

const SLIDES = [
  {
    emoji: '👋',
    titulo: (nombre) => `¡Hola, ${nombre}!`,
    subtitulo: 'Tu cuenta está activa y lista para usar.',
    body: ({ diasRestantes }) => (
      <div className="flex flex-col gap-3 w-full">
        <div className="rounded-2xl px-5 py-4 flex items-center gap-4"
          style={{ background: 'rgba(59,130,246,.12)', border: '1px solid rgba(59,130,246,.3)' }}>
          <span className="text-3xl">🎯</span>
          <div>
            <p className="text-blue-400 font-bold text-[15px]">Plan Profesional — Demo</p>
            <p className="text-gray-400 text-[13px]">
              {diasRestantes != null
                ? `Te quedan ${diasRestantes} días de prueba gratis`
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
    ),
  },
  {
    emoji: '🔧',
    titulo: () => '¿Qué podés hacer?',
    subtitulo: 'Todo lo que necesitás para gestionar tu negocio.',
    body: () => (
      <div className="flex flex-col gap-3 w-full">
        {[
          { icon: '📋', titulo: 'Presupuestos profesionales', desc: 'Creá y enviá presupuestos en minutos. El cliente los firma digitalmente.' },
          { icon: '🏗', titulo: 'Gestión de obras', desc: 'Seguí el avance, registrá gastos y horas de cada trabajo.' },
          { icon: '👥', titulo: 'Tus clientes', desc: 'Historial completo, contacto directo por WhatsApp o llamada.' },
          { icon: '📊', titulo: 'Estadísticas y cobros', desc: 'Sabé cuánto facturaste, cobrado y qué está pendiente.' },
        ].map(f => (
          <div key={f.titulo} className="flex items-start gap-3 rounded-2xl px-4 py-3"
            style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
            <span className="text-[22px] mt-0.5 shrink-0">{f.icon}</span>
            <div>
              <p className="text-white font-semibold text-[13px]">{f.titulo}</p>
              <p className="text-gray-500 text-[11px] mt-0.5">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    emoji: '🚀',
    titulo: () => '¡Todo listo!',
    subtitulo: 'Empezá creando tu primer presupuesto — tarda menos de 2 minutos.',
    body: ({ diasRestantes }) => (
      <div className="flex flex-col gap-3 w-full">
        <div className="rounded-2xl px-5 py-4 text-center"
          style={{ background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.2)' }}>
          <p className="text-green-400 font-bold text-[15px] mb-1">Tu prueba vence en</p>
          <p className="text-white font-bold text-[42px] leading-tight">
            {diasRestantes ?? 28}
          </p>
          <p className="text-gray-500 text-[13px]">días</p>
        </div>
        <div className="rounded-2xl px-5 py-3 flex items-center gap-3"
          style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
          <span className="text-xl">💬</span>
          <p className="text-gray-300 text-[13px]">
            Cuando quieras activar tu plan, contactanos por WhatsApp
          </p>
        </div>
        <div className="rounded-2xl px-5 py-3 flex items-center gap-3"
          style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
          <span className="text-xl">🔔</span>
          <p className="text-gray-300 text-[13px]">
            Te avisamos cuando queden 5 días para que no pierdas tus datos
          </p>
        </div>
      </div>
    ),
  },
]

export default function Onboarding({ nombre, diasRestantes, onFinalizar }) {
  const [slide, setSlide] = useState(0)
  const actual = SLIDES[slide]
  const esUltimo = slide === SLIDES.length - 1

  return (
    <div className="flex flex-col h-full" style={{ background: '#0D0D14' }}>
      {/* header con dots */}
      <div className="flex items-center justify-between px-6 pt-14 pb-6">
        <div className="flex gap-2">
          {SLIDES.map((_, i) => (
            <div key={i} className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === slide ? 28 : 8,
                background: i === slide ? '#3B82F6' : '#2A2A3A',
              }} />
          ))}
        </div>
        {!esUltimo && (
          <button onClick={onFinalizar}
            className="text-gray-600 text-[13px] underline">
            Saltar
          </button>
        )}
      </div>

      {/* contenido */}
      <div className="flex-1 flex flex-col px-6 overflow-y-auto pb-8">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6"
            style={{ background: 'rgba(59,130,246,.12)', border: '1px solid rgba(59,130,246,.25)' }}>
            <span className="text-5xl">{actual.emoji}</span>
          </div>
          <h1 className="text-white font-bold text-[26px] leading-tight mb-2">
            {actual.titulo(nombre)}
          </h1>
          <p className="text-gray-400 text-[14px] max-w-xs">
            {actual.subtitulo}
          </p>
        </div>

        <actual.body diasRestantes={diasRestantes} />
      </div>

      {/* botón */}
      <div className="px-6 pb-10 pt-4">
        <button
          onClick={() => esUltimo ? onFinalizar() : setSlide(s => s + 1)}
          className="w-full py-4 rounded-2xl text-white font-bold text-[16px] flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)', boxShadow: '0 4px 20px rgba(59,130,246,.4)' }}>
          {esUltimo ? '🚀 Ir a mi panel' : (
            <>Siguiente <ChevronRight size={18} /></>
          )}
        </button>
      </div>
    </div>
  )
}
