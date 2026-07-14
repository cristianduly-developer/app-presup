import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function loginGoogle() {
    setLoading(true)
    setError('')
    const { data, error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        skipBrowserRedirect: true,
      },
    })
    if (err) { setError(err.message); setLoading(false); return }
    if (data?.url) window.location.href = data.url
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6"
      style={{ background: '#0D0D14' }}>

      {/* logo */}
      <div className="mb-10 text-center">
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-5"
          style={{ background: '#3B82F6', boxShadow: '0 0 40px rgba(59,130,246,0.4)' }}>
          <span className="text-5xl">🔧</span>
        </div>
        <h1 className="text-white font-bold text-[26px] tracking-tight">App Presup</h1>
        <p className="text-gray-500 text-[14px] mt-2">El sistema operativo de tu oficio</p>
      </div>

      {/* features */}
      <div className="w-full mb-8 flex flex-col gap-3">
        {[
          { icon: '📋', text: 'Presupuestá en menos de 2 minutos' },
          { icon: '💰', text: 'Calculá tu ganancia y valor hora real' },
          { icon: '💬', text: 'Enviá por WhatsApp con un toque' },
        ].map(f => (
          <div key={f.text} className="flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
            <span className="text-xl">{f.icon}</span>
            <span className="text-gray-300 text-[13px]">{f.text}</span>
          </div>
        ))}
      </div>

      {/* botón Google */}
      <button
        onClick={loginGoogle}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-[15px] transition-all active:opacity-80 disabled:opacity-60"
        style={{ background: '#fff', color: '#1a1a1a' }}>
        {loading ? (
          <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
        ) : (
          <GoogleIcon />
        )}
        {loading ? 'Redirigiendo...' : 'Continuar con Google'}
      </button>

      {error && <p className="text-red-400 text-xs text-center mt-3">{error}</p>}

      <p className="text-gray-600 text-[11px] text-center mt-6 px-4">
        Al ingresar aceptás los términos de uso. Tus datos están protegidos y son solo tuyos.
      </p>

      <a href="https://wa.me/5492236965481?text=Hola%2C+soy+usuario+de+App+Presupuestos+y+necesito+soporte" target="_blank" rel="noreferrer"
        className="flex items-center justify-center gap-2 mt-5 text-[13px] font-medium"
        style={{ color: '#22C55E' }}>
        <span>💬</span> Contactar soporte
      </a>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}
