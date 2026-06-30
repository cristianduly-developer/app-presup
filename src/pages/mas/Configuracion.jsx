import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Camera, ChevronRight } from 'lucide-react'
import { useAuth } from '../../lib/useAuth'

export default function Configuracion() {
  const navigate = useNavigate()
  const { user, perfil, logout, actualizarPerfil } = useAuth()
  const [form, setForm] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)

  useEffect(() => {
    if (perfil) {
      setForm({
        nombre:            perfil.nombre || '',
        oficio:            perfil.oficio || '',
        matricula:         perfil.matricula || '',
        telefono:          perfil.telefono || '',
        email:             user?.email || '',
        ciudad:            perfil.ciudad || '',
        provincia:         perfil.provincia || '',
        cuit:              perfil.cuit || '',
        cbu:               perfil.cbu || '',
        alias_banco:       perfil.alias_banco || '',
        banco:             perfil.banco || '',
        iva:               perfil.condicion_iva || 'monotributista',
        vigencia_default:  perfil.vigencia_default || 5,
        recargo_urgencia:  perfil.recargo_urgencia || 30,
        recargo_nocturno:  perfil.recargo_nocturno || 50,
        recargo_feriado:   perfil.recargo_feriado || 100,
        whatsapp_msg:      perfil.whatsapp_msg || 'Hola {cliente}, te envío el presupuesto #{numero} por {total}. Podés verlo acá: {link}',
        senia_activa:      perfil.senia_activa ?? false,
        senia_porcentaje:  perfil.senia_porcentaje ?? 30,
      })
    }
  }, [perfil])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function guardar() {
    if (!form) return
    setGuardando(true)
    const { error } = await actualizarPerfil({
      nombre:           form.nombre,
      oficio:           form.oficio,
      matricula:        form.matricula,
      telefono:         form.telefono,
      ciudad:           form.ciudad,
      provincia:        form.provincia,
      cuit:             form.cuit,
      condicion_iva:    form.iva,
      cbu:              form.cbu,
      alias_banco:      form.alias_banco,
      banco:            form.banco,
      vigencia_default: Number(form.vigencia_default),
      recargo_urgencia: Number(form.recargo_urgencia),
      recargo_nocturno: Number(form.recargo_nocturno),
      recargo_feriado:  Number(form.recargo_feriado),
      whatsapp_msg:     form.whatsapp_msg,
      senia_activa:     form.senia_activa,
      senia_porcentaje: Number(form.senia_porcentaje),
    })
    setGuardando(false)
    if (!error) {
      setGuardado(true)
      setTimeout(() => setGuardado(false), 2000)
    }
  }

  if (!form) return (
    <div className="flex-1 flex items-center justify-center" style={{ background: '#0D0D14' }}>
      <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(59,130,246,.3)', borderTopColor: '#3B82F6' }} />
    </div>
  )

  const inicial = form.nombre?.charAt(0)?.toUpperCase() || '?'

  return (
    <div className="flex-1 overflow-y-auto pb-24" style={{ background: '#0D0D14' }}>
      <div className="flex items-center gap-3 px-4 pt-12 pb-3 sticky top-0 z-10" style={{ background: '#0D0D14' }}>
        <button onClick={() => navigate(-1)} className="text-gray-400"><ArrowLeft size={22} /></button>
        <h1 className="text-white font-bold text-[20px] flex-1">Configuración</h1>
        <button onClick={guardar} disabled={guardando}
          className="font-semibold text-[13px] px-4 py-2 rounded-xl"
          style={{ background: guardado ? '#22C55E' : '#3B82F6', color: '#fff', opacity: guardando ? .6 : 1 }}>
          {guardando ? 'Guardando…' : guardado ? 'Guardado ✓' : 'Guardar'}
        </button>
      </div>

      {/* foto perfil */}
      <div className="flex flex-col items-center py-5">
        <div className="relative">
          <div className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold"
            style={{ background: '#3B82F6' }}>{inicial}</div>
          <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: '#3B82F6' }}>
            <Camera size={14} className="text-white" />
          </button>
        </div>
        <p className="text-gray-500 text-xs mt-2">{user?.email}</p>
      </div>

      <Section title="DATOS PERSONALES">
        <Field label="Nombre completo"         value={form.nombre}    onChange={v => set('nombre', v)} />
        <Field label="Oficio / Especialidad"   value={form.oficio}    onChange={v => set('oficio', v)}    placeholder="Plomero, Gasista, Electricista…" />
        <Field label="Matrícula / Habilitación" value={form.matricula} onChange={v => set('matricula', v)} placeholder="Opcional" />
        <Field label="Teléfono / WhatsApp"     value={form.telefono}  onChange={v => set('telefono', v)}  type="tel" />
      </Section>

      <Section title="UBICACIÓN">
        <Field label="Ciudad"    value={form.ciudad}    onChange={v => set('ciudad', v)} />
        <Field label="Provincia" value={form.provincia} onChange={v => set('provincia', v)} />
      </Section>

      <Section title="DATOS FISCALES">
        <Field label="CUIT" value={form.cuit} onChange={v => set('cuit', v)} placeholder="20-12345678-9" />
        <SelectField label="Condición IVA" value={form.iva} onChange={v => set('iva', v)}
          options={[['monotributista','Monotributista'],['responsable_inscripto','Responsable Inscripto'],['exento','Exento'],['consumidor_final','Consumidor Final']]} />
      </Section>

      <Section title="DATOS BANCARIOS">
        <Field label="CBU" value={form.cbu} onChange={v => set('cbu', v)} placeholder="0000003100012345678901" />
        <Field label="Alias" value={form.alias_banco} onChange={v => set('alias_banco', v)} placeholder="MI.ALIAS.BANCO" />
        <Field label="Banco" value={form.banco} onChange={v => set('banco', v)} placeholder="Banco Nación, Mercado Pago…" />
      </Section>

      <Section title="PRESUPUESTOS">
        <Field label="Vigencia por defecto (días)" value={form.vigencia_default} onChange={v => set('vigencia_default', v)} type="number" />
      </Section>

      <Section title="RECARGOS">
        <Field label="Urgencia (%)"  value={form.recargo_urgencia} onChange={v => set('recargo_urgencia', v)}  type="number" />
        <Field label="Nocturno (%)"  value={form.recargo_nocturno} onChange={v => set('recargo_nocturno', v)} type="number" />
        <Field label="Feriado (%)"   value={form.recargo_feriado}  onChange={v => set('recargo_feriado', v)}  type="number" />
      </Section>

      <Section title="WHATSAPP">
        <div className="px-4 pb-4 pt-2">
          <label className="text-gray-500 text-[11px] block mb-1.5">Mensaje por defecto</label>
          <textarea value={form.whatsapp_msg} onChange={e => set('whatsapp_msg', e.target.value)} rows={4}
            className="w-full rounded-xl px-3 py-2 text-white text-[13px] resize-none outline-none"
            style={{ background: '#0D0D14', border: '1px solid #2A2A3A' }} />
          <p className="text-gray-600 text-[10px] mt-1">Variables: {'{cliente}'} {'{numero}'} {'{total}'} {'{link}'}</p>
        </div>
      </Section>

      <Section title="SEÑA">
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #1E1E2E' }}>
          <div>
            <p className="text-gray-400 text-[13px]">Mostrar seña al cliente</p>
            <p className="text-gray-600 text-[11px] mt-0.5">Aparece en el link del presupuesto</p>
          </div>
          <button onClick={() => set('senia_activa', !form.senia_activa)}
            className="w-11 h-6 rounded-full transition-all shrink-0 relative"
            style={{ background: form.senia_activa ? '#22C55E' : '#2A2A3A' }}>
            <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
              style={{ left: form.senia_activa ? 'calc(100% - 22px)' : '2px' }} />
          </button>
        </div>
        {form.senia_activa && (
          <Field label="Porcentaje de seña (%)" value={form.senia_porcentaje}
            onChange={v => set('senia_porcentaje', v)} type="number" placeholder="30" />
        )}
      </Section>

      <Section title="CUENTA">
        <button onClick={logout}
          className="flex items-center justify-between w-full px-4 py-3 active:opacity-70">
          <span className="text-red-400 text-[14px]">Cerrar sesión</span>
          <ChevronRight size={16} className="text-gray-600" />
        </button>
      </Section>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="mb-4">
      <p className="px-5 mb-2 text-[11px] font-semibold tracking-wider" style={{ color: '#4B5563' }}>{title}</p>
      <div className="mx-4 rounded-2xl overflow-hidden" style={{ background: '#161622', border: '1px solid #1E1E2E' }}>
        {children}
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid #1E1E2E' }}>
      <label className="text-gray-400 text-[13px] w-40 shrink-0">{label}</label>
      <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="flex-1 bg-transparent text-white text-[13px] text-right outline-none placeholder-gray-600" />
    </div>
  )
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid #1E1E2E' }}>
      <label className="text-gray-400 text-[13px] w-40 shrink-0">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="flex-1 bg-transparent text-white text-[13px] text-right outline-none appearance-none">
        {options.map(([v, l]) => <option key={v} value={v} style={{ background: '#161622' }}>{l}</option>)}
      </select>
      <ChevronRight size={14} className="text-gray-600 shrink-0" />
    </div>
  )
}
