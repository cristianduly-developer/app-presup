import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, FileText } from 'lucide-react'

const TIPOS = [
  { id: 'resumen_mensual',    label: 'Resumen mensual',       icon: '📊', desc: 'Facturado, cobrado, ganancia y obras del mes' },
  { id: 'resumen_semanal',    label: 'Resumen semanal',       icon: '📅', desc: 'Actividad de los últimos 7 días' },
  { id: 'presupuestos',       label: 'Presupuestos',          icon: '📄', desc: 'Listado completo con estados y montos' },
  { id: 'obras',              label: 'Obras',                 icon: '🏗',  desc: 'Detalle de obras con rentabilidad por obra' },
  { id: 'clientes',           label: 'Clientes',              icon: '👥', desc: 'Historial y facturación por cliente' },
  { id: 'gastos',             label: 'Gastos',                icon: '🧾', desc: 'Todos los gastos registrados por período' },
  { id: 'rentabilidad',       label: 'Rentabilidad',          icon: '💰', desc: 'Ganancia neta y valor hora real' },
  { id: 'cobros_pendientes',  label: 'Cobros pendientes',     icon: '⏳', desc: 'Obras y presupuestos con saldo a cobrar' },
]

const PERIODOS = [
  { id: 'esta_semana',  label: 'Esta semana' },
  { id: 'este_mes',     label: 'Este mes' },
  { id: 'mes_pasado',   label: 'Mes pasado' },
  { id: 'trimestre',    label: 'Último trimestre' },
  { id: 'anio',         label: 'Este año' },
  { id: 'personalizado',label: 'Personalizado' },
]

export default function Reportes() {
  const navigate = useNavigate()
  const [tipo, setTipo] = useState(null)
  const [periodo, setPeriodo] = useState('este_mes')
  const [generando, setGenerando] = useState(false)

  async function generar() {
    if (!tipo) return
    setGenerando(true)
    await new Promise(r => setTimeout(r, 1500))
    setGenerando(false)
    alert(`Reporte "${TIPOS.find(t => t.id === tipo)?.label}" generado.\n(Integración PDF pendiente de conectar a Supabase)`)
  }

  return (
    <div className="flex-1 overflow-y-auto pb-24 safe-top">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 sticky top-0 bg-surface-bg z-10">
        <button onClick={() => navigate(-1)} className="text-gray-400"><ArrowLeft size={22} /></button>
        <h1 className="text-white font-bold text-lg flex-1">Reportes</h1>
      </div>

      {/* tipo de reporte */}
      <div className="px-4 mb-5">
        <p className="text-gray-500 text-[11px] font-semibold tracking-wider mb-3">TIPO DE REPORTE</p>
        <div className="flex flex-col gap-2">
          {TIPOS.map(t => (
            <button key={t.id} onClick={() => setTipo(t.id)}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left active:opacity-70 border ${
                tipo === t.id ? 'bg-blue-900/30 border-brand-blue' : 'bg-surface-card border-transparent'
              }`}>
              <span className="text-2xl shrink-0">{t.icon}</span>
              <div className="flex-1">
                <p className="text-white text-sm font-medium">{t.label}</p>
                <p className="text-gray-500 text-xs">{t.desc}</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                tipo === t.id ? 'border-brand-blue bg-brand-blue' : 'border-gray-600'
              }`}>
                {tipo === t.id && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* período */}
      <div className="px-4 mb-6">
        <p className="text-gray-500 text-[11px] font-semibold tracking-wider mb-3">PERÍODO</p>
        <div className="grid grid-cols-2 gap-2">
          {PERIODOS.map(p => (
            <button key={p.id} onClick={() => setPeriodo(p.id)}
              className={`py-3 rounded-xl text-sm font-medium ${
                periodo === p.id ? 'bg-brand-blue text-white' : 'bg-surface-card text-gray-400'
              }`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* preview */}
      {tipo && (
        <div className="mx-4 mb-5 bg-surface-card rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">{TIPOS.find(t => t.id === tipo)?.icon}</span>
            <div>
              <p className="text-white font-semibold text-sm">{TIPOS.find(t => t.id === tipo)?.label}</p>
              <p className="text-gray-500 text-xs">PDF · {PERIODOS.find(p => p.id === periodo)?.label}</p>
            </div>
          </div>
          <p className="text-gray-400 text-xs">El reporte incluirá todos los datos del período seleccionado en formato PDF descargable y listo para compartir.</p>
        </div>
      )}

      {/* generar */}
      <div className="px-4">
        <button
          onClick={generar}
          disabled={!tipo || generando}
          className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-all ${
            tipo ? 'bg-brand-blue text-white active:opacity-80' : 'bg-surface-elevated text-gray-600 cursor-not-allowed'
          }`}
        >
          {generando ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generando PDF...
            </>
          ) : (
            <>
              <Download size={20} />
              Generar y descargar PDF
            </>
          )}
        </button>
        {!tipo && <p className="text-gray-600 text-xs text-center mt-2">Seleccioná un tipo de reporte para continuar</p>}
      </div>
    </div>
  )
}
