import { Phone, MessageCircle, MapPin, Plus, ChevronRight } from 'lucide-react'
import StatusBadge from '../../components/ui/StatusBadge'

const DIAS = ['Lun 19', 'Mar 20', 'Mié 21', 'Jue 22', 'Vie 23']

const VISITAS = [
  { hora: '09:30', cliente: 'Juan Pérez',     desc: 'Ver filtración en baño',    dir: 'Bolívar 1234', status: 'pendiente',  tel: '1123456789' },
  { hora: '11:00', cliente: 'María Gómez',    desc: 'Instalación termotanque',   dir: 'Alberti 2456', status: 'confirmada', tel: '1187654321' },
  { hora: '15:30', cliente: 'Carlos Ruiz',    desc: 'Revisión instalación gas',  dir: 'Colón 3400',   status: 'pendiente',  tel: '1145678901' },
]

const DOT_COLOR = { pendiente: 'bg-yellow-400', confirmada: 'bg-green-400', cancelada: 'bg-red-400' }

export default function Agenda() {
  return (
    <div className="flex-1 overflow-y-auto pb-24 safe-top">
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <h1 className="text-white font-bold text-xl">Agenda</h1>
        <button className="w-9 h-9 bg-brand-blue rounded-full flex items-center justify-center">
          <Plus size={18} className="text-white" />
        </button>
      </div>

      {/* selector de días */}
      <div className="flex gap-2 px-4 mb-5 overflow-x-auto pb-1">
        {DIAS.map((d, i) => (
          <button key={d}
            className={`flex flex-col items-center px-4 py-2 rounded-2xl min-w-[60px] ${i === 1 ? 'bg-brand-blue' : 'bg-surface-elevated'}`}>
            <span className={`text-[10px] ${i === 1 ? 'text-blue-200' : 'text-gray-500'}`}>{d.split(' ')[0]}</span>
            <span className={`text-lg font-bold ${i === 1 ? 'text-white' : 'text-gray-400'}`}>{d.split(' ')[1]}</span>
          </button>
        ))}
      </div>

      {/* línea de tiempo */}
      <div className="px-4">
        <div className="relative pl-14">
          {/* línea vertical */}
          <div className="absolute left-10 top-2 bottom-2 w-0.5 bg-surface-border" />

          <div className="flex flex-col gap-4">
            {VISITAS.map((v, i) => (
              <div key={i} className="relative">
                {/* hora */}
                <span className="absolute -left-14 top-3 text-gray-500 text-xs w-10 text-right">{v.hora}</span>
                {/* dot */}
                <div className={`absolute -left-[18px] top-3.5 w-3 h-3 rounded-full border-2 border-surface-bg ${DOT_COLOR[v.status]}`} />

                <div className="bg-surface-card rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-white font-semibold text-sm">{v.cliente}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{v.desc}</p>
                      <p className="text-gray-600 text-[10px] mt-0.5">📍 {v.dir}</p>
                    </div>
                    <StatusBadge status={v.status} />
                  </div>
                  <div className="flex gap-2 mt-3">
                    <a href={`tel:${v.tel}`}
                      className="flex-1 flex items-center justify-center gap-2 bg-surface-elevated py-2 rounded-xl text-gray-400 text-xs active:opacity-70"
                      onClick={e => e.stopPropagation()}>
                      <Phone size={14} /> Llamar
                    </a>
                    <button className="flex-1 flex items-center justify-center gap-2 bg-green-900/40 py-2 rounded-xl text-green-400 text-xs active:opacity-70">
                      <MessageCircle size={14} /> WhatsApp
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-2 bg-blue-900/40 py-2 rounded-xl text-blue-400 text-xs active:opacity-70">
                      <MapPin size={14} /> Maps
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
