import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.jsx'
import { reportarError } from './lib/reportarError.js'

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.1,
  enabled: !!import.meta.env.VITE_SENTRY_DSN,
})

window.onerror = (msg, _src, _line, _col, error) => {
  reportarError(error || new Error(String(msg)), { pantalla: window.location.pathname })
}
window.onunhandledrejection = (e) => {
  reportarError(e.reason || new Error('Unhandled rejection'), { pantalla: window.location.pathname })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
