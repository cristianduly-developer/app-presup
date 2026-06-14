const MAP = {
  borrador:        { label: 'Borrador',        cls: 'bg-gray-700 text-gray-300' },
  enviado:         { label: 'Enviado',          cls: 'bg-blue-900/60 text-blue-300' },
  aprobado:        { label: 'Aprobado',         cls: 'bg-green-900/60 text-green-300' },
  vencido:         { label: 'Vencido',          cls: 'bg-red-900/60 text-red-300' },
  en_ejecucion:    { label: 'En ejecución',     cls: 'bg-orange-900/60 text-orange-300' },
  pendiente_cobro: { label: 'Pend. cobro',      cls: 'bg-purple-900/60 text-purple-300' },
  finalizada:      { label: 'Finalizada',       cls: 'bg-teal-900/60 text-teal-300' },
  cobrada:         { label: 'Cobrada',          cls: 'bg-green-900/60 text-green-300' },
  presupuestada:   { label: 'Presupuestada',    cls: 'bg-gray-700 text-gray-300' },
  pendiente:       { label: 'Pendiente',        cls: 'bg-yellow-900/60 text-yellow-300' },
  confirmada:      { label: 'Confirmada',       cls: 'bg-green-900/60 text-green-300' },
}

export default function StatusBadge({ status }) {
  const s = MAP[status] || { label: status, cls: 'bg-gray-700 text-gray-300' }
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.cls}`}>
      {s.label}
    </span>
  )
}
