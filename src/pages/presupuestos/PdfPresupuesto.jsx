import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { fmt, fmtFecha } from '../../lib/fmt'

// Verde militar / oliva profesional
const VERDE  = '#3D5A3E'   // verde oscuro militar
const VERDE2 = '#f0f4f0'   // fondo muy sutil verde
const ACENTO = '#5C7A5D'   // verde medio para detalles
const GRIS   = '#6B7280'
const NEGRO  = '#1A1A1A'
const LINEA  = '#E2E8E2'

export default function PdfPresupuesto() {
  const { id } = useParams()
  const [p, setP]           = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function cargar() {
      const { data: presup } = await supabase
        .from('presupuestos')
        .select('*, clientes(*), presupuesto_items(*)')
        .eq('id', id)
        .single()
      if (!presup) { setLoading(false); return }
      const { data: perf } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', presup.user_id)
        .single()
      setP(presup)
      setPerfil(perf)
      setLoading(false)
    }
    cargar()
  }, [id])

  useEffect(() => {
    if (!loading && p) setTimeout(() => window.print(), 500)
  }, [loading, p])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif', background: '#f5f5f0' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
        <div style={{ color: GRIS, fontWeight: 600 }}>Preparando PDF...</div>
      </div>
    </div>
  )
  if (!p) return <div style={{ padding: 40, fontFamily: 'sans-serif' }}>Presupuesto no encontrado</div>

  const items    = (p.presupuesto_items || []).sort((a, b) => a.orden - b.orden)
  const totalMat = items.filter(i => i.tipo === 'material').reduce((s, i) => s + (i.subtotal || i.cantidad * i.precio_unit || 0), 0)
  const totalMO  = items.filter(i => i.tipo === 'mano_obra').reduce((s, i) => s + (i.subtotal || i.cantidad * i.precio_unit || 0), 0)

  const STATUS_COLOR = { borrador: '#6B7280', enviado: '#4A7C4A', aprobado: '#2D5E2D', rechazado: '#8B2020', vencido: '#8B2020' }
  const STATUS_LABEL = { borrador: 'Borrador', enviado: 'Enviado', aprobado: 'Aprobado', rechazado: 'Rechazado', vencido: 'Vencido' }
  const statusColor  = STATUS_COLOR[p.status] || '#6B7280'
  const statusLabel  = STATUS_LABEL[p.status] || p.status

  const profUbicacion = [perfil?.ciudad, perfil?.provincia].filter(Boolean).join(', ')
  const inicialProf   = perfil?.nombre?.charAt(0)?.toUpperCase() || '?'
  const inicialCli    = p.clientes?.nombre?.charAt(0)?.toUpperCase() || '?'

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f0f2ed; font-family: 'Helvetica Neue', Arial, sans-serif; color: ${NEGRO}; }
        .print-page { background: white; }
        @media print {
          body { background: white; }
          .no-print { display: none !important; }
          @page { margin: 0; size: A4; }
          .print-page { box-shadow: none !important; margin: 0 !important; }
        }
      `}</style>

      {/* barra pantalla */}
      <div className="no-print" style={{ background: NEGRO, padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#9CA3AF', fontSize: 13 }}>Presupuesto #{p.numero} · {perfil?.nombre}</span>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => window.print()}
            style={{ background: VERDE, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            🖨 Imprimir / Guardar PDF
          </button>
          <button onClick={() => window.close()}
            style={{ background: '#374151', color: '#D1D5DB', border: 'none', borderRadius: 8, padding: '9px 16px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            Cerrar
          </button>
        </div>
      </div>

      <div className="print-page" style={{ maxWidth: 794, margin: '24px auto', boxShadow: '0 4px 32px rgba(0,0,0,.10)' }}>

        {/* banda superior verde */}
        <div style={{ background: VERDE, height: 5 }} />

        <div style={{ padding: '40px 48px 48px' }}>

          {/* HEADER */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36, paddingBottom: 28, borderBottom: `1px solid ${LINEA}` }}>

            {/* profesional */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              {perfil?.logo_url
                ? <img src={perfil.logo_url} alt="Logo" style={{ width: 64, height: 64, objectFit: 'contain', borderRadius: 10, border: `1px solid ${LINEA}` }} />
                : <div style={{ width: 64, height: 64, background: VERDE, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, color: '#fff', fontWeight: 800, flexShrink: 0 }}>
                    {inicialProf}
                  </div>
              }
              <div>
                <div style={{ fontSize: 19, fontWeight: 800, color: NEGRO, marginBottom: 2, letterSpacing: -0.3 }}>{perfil?.nombre || 'Profesional'}</div>
                {perfil?.oficio && <div style={{ fontSize: 11, color: ACENTO, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {perfil.oficio.charAt(0).toUpperCase() + perfil.oficio.slice(1)}
                </div>}
                <div style={{ fontSize: 11, color: GRIS, lineHeight: 1.9 }}>
                  {profUbicacion && <div>{profUbicacion}</div>}
                  {perfil?.telefono && <div>{perfil.telefono}</div>}
                  {perfil?.cuit && <div>CUIT {perfil.cuit}</div>}
                  {perfil?.condicion_iva && <div>{perfil.condicion_iva.charAt(0).toUpperCase() + perfil.condicion_iva.slice(1)}</div>}
                  {perfil?.matricula && <div>Mat. {perfil.matricula}</div>}
                </div>
              </div>
            </div>

            {/* número de presupuesto */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: ACENTO, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 4 }}>Presupuesto</div>
              <div style={{ fontSize: 48, fontWeight: 900, color: VERDE, lineHeight: 1, marginBottom: 6, letterSpacing: -1 }}>#{p.numero}</div>
              {p.titulo && <div style={{ fontSize: 13, fontWeight: 700, color: NEGRO, marginBottom: 6 }}>{p.titulo}</div>}
              <div style={{ fontSize: 11, color: GRIS, marginBottom: 10 }}>Fecha: {fmtFecha(p.created_at)}</div>
              <span style={{ display: 'inline-block', padding: '4px 14px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: statusColor + '18', color: statusColor, border: `1px solid ${statusColor}33` }}>
                {statusLabel}
              </span>
            </div>
          </div>

          {/* CLIENTE */}
          {p.clientes && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: ACENTO, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>Presupuesto para</div>
              <div style={{ border: `1px solid ${LINEA}`, borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ background: VERDE2, borderBottom: `1px solid ${LINEA}`, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: VERDE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                    {inicialCli}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: NEGRO }}>{p.clientes.nombre}</div>
                    {p.clientes.cuit && <div style={{ fontSize: 11, color: GRIS }}>CUIT: {p.clientes.cuit}</div>}
                  </div>
                </div>
                <div style={{ padding: '12px 20px', display: 'flex', flexWrap: 'wrap', gap: '8px 36px', background: '#fff' }}>
                  {p.clientes.telefono && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#374151' }}>
                      <span style={{ color: ACENTO }}>☎</span> {p.clientes.telefono}
                    </div>
                  )}
                  {p.clientes.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#374151' }}>
                      <span style={{ color: ACENTO }}>✉</span> {p.clientes.email}
                    </div>
                  )}
                  {p.clientes.direccion && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#374151' }}>
                      <span style={{ color: ACENTO }}>📍</span> {p.clientes.direccion}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TABLA ITEMS */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: ACENTO, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>Detalle del presupuesto</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: VERDE }}>
                  <th style={{ textAlign: 'left', padding: '9px 12px', fontSize: 9, fontWeight: 700, color: '#fff', letterSpacing: 1.5, textTransform: 'uppercase' }}>Descripción</th>
                  <th style={{ textAlign: 'center', padding: '9px 12px', fontSize: 9, fontWeight: 700, color: '#fff', letterSpacing: 1.5, textTransform: 'uppercase', width: 55 }}>Cant.</th>
                  <th style={{ textAlign: 'right', padding: '9px 12px', fontSize: 9, fontWeight: 700, color: '#fff', letterSpacing: 1.5, textTransform: 'uppercase', width: 110 }}>P. Unit.</th>
                  <th style={{ textAlign: 'right', padding: '9px 12px', fontSize: 9, fontWeight: 700, color: '#fff', letterSpacing: 1.5, textTransform: 'uppercase', width: 110 }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => item.tipo === 'seccion' ? (
                  <tr key={i}>
                    <td colSpan={4} style={{ padding: '10px 12px 6px', background: VERDE2, borderLeft: `3px solid ${VERDE}` }}>
                      <div style={{ fontWeight: 700, fontSize: 10, color: VERDE, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                        {item.descripcion || 'Etapa'}
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={i} style={{ borderBottom: `1px solid ${LINEA}`, background: i % 2 === 0 ? '#fff' : '#FAFAF8' }}>
                    <td style={{ padding: '11px 12px', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 600, color: NEGRO, fontSize: 13 }}>
                        {item.descripcion || (item.tipo === 'mano_obra' ? 'Mano de obra' : 'Material')}
                      </div>
                      <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>
                        {item.tipo === 'material' ? 'Material' : 'Mano de obra'}{item.unidad && item.unidad !== 'global' ? ` · ${item.unidad}` : ''}
                      </div>
                    </td>
                    <td style={{ padding: '11px 12px', textAlign: 'center', color: GRIS, fontSize: 13 }}>{item.cantidad}</td>
                    <td style={{ padding: '11px 12px', textAlign: 'right', color: GRIS, fontSize: 13 }}>{fmt(item.precio_unit)}</td>
                    <td style={{ padding: '11px 12px', textAlign: 'right', fontWeight: 700, color: NEGRO, fontSize: 13 }}>{fmt(item.subtotal || item.cantidad * item.precio_unit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* totales */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <div style={{ minWidth: 280 }}>
                {totalMat > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 12, color: GRIS, borderBottom: `1px solid ${LINEA}` }}>
                    <span>Subtotal materiales</span><span>{fmt(totalMat)}</span>
                  </div>
                )}
                {totalMO > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 12, color: GRIS, borderBottom: `1px solid ${LINEA}` }}>
                    <span>Subtotal mano de obra</span><span>{fmt(totalMO)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 18px', marginTop: 8, background: VERDE, borderRadius: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#fff', letterSpacing: 1, textTransform: 'uppercase' }}>Total</span>
                  <span style={{ fontWeight: 900, fontSize: 22, color: '#fff', letterSpacing: -0.5 }}>{fmt(p.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* NOTAS */}
          {p.notas_internas && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: ACENTO, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>Observaciones</div>
              <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.8, background: VERDE2, borderRadius: 8, padding: '12px 16px', border: `1px solid ${LINEA}` }}>
                {p.notas_internas}
              </div>
            </div>
          )}

          {/* FIRMA */}
          {p.firma_imagen && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: ACENTO, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>Firma del cliente</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 48 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ border: `1px solid ${LINEA}`, borderRadius: 8, padding: 8, background: '#FAFAF8', display: 'inline-block' }}>
                    <img src={p.firma_imagen} alt="Firma" style={{ height: 80, maxWidth: 240, display: 'block' }} />
                  </div>
                  <div style={{ marginTop: 6, borderTop: `1px solid ${LINEA}`, paddingTop: 4 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: NEGRO }}>{p.firma_nombre || p.clientes?.nombre || 'Cliente'}</div>
                    {p.firma_fecha && <div style={{ fontSize: 10, color: GRIS }}>Firmado el {new Date(p.firma_fecha).toLocaleString('es-AR')}</div>}
                  </div>
                </div>
                <div style={{ flex: 1, textAlign: 'right' }}>
                  <div style={{ borderTop: `1px solid ${LINEA}`, paddingTop: 4, display: 'inline-block', minWidth: 200 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: NEGRO }}>{perfil?.nombre}</div>
                    <div style={{ fontSize: 10, color: GRIS }}>Profesional</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FOOTER */}
          <div style={{ marginTop: 36, paddingTop: 20, borderTop: `1px solid ${LINEA}` }}>

            <div style={{ background: VERDE2, border: `1px solid ${LINEA}`, borderRadius: 8, padding: '11px 16px', marginBottom: 14, fontSize: 12, color: VERDE, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span>📅</span>
              <span><strong>Presupuesto válido por {p.vigencia_dias} días</strong>{p.fecha_vence ? ` — vence el ${fmtFecha(p.fecha_vence)}` : ''}</span>
            </div>

            {(perfil?.cbu || perfil?.alias_banco) && (
              <div style={{ background: VERDE2, border: `1px solid ${LINEA}`, borderRadius: 8, padding: '11px 16px', marginBottom: 14, fontSize: 12, color: NEGRO }}>
                <div style={{ fontWeight: 700, marginBottom: 5, color: VERDE }}>Datos para transferencia</div>
                {perfil.banco      && <div>Banco: <strong>{perfil.banco}</strong></div>}
                {perfil.cbu        && <div>CBU: <strong>{perfil.cbu}</strong></div>}
                {perfil.alias_banco && <div>Alias: <strong>{perfil.alias_banco}</strong></div>}
                <div style={{ marginTop: 3 }}>A nombre de: <strong>{perfil.nombre}</strong>{perfil.cuit ? ` · CUIT: ${perfil.cuit}` : ''}</div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18 }}>
              <div style={{ fontSize: 11, color: '#9CA3AF' }}>
                {perfil?.telefono && `${perfil.nombre} · ${perfil.telefono}`}
              </div>
              <div style={{ fontSize: 10, color: '#C4C4BC' }}>
                Presupuesto #{p.numero} · {fmtFecha(new Date().toISOString())}
              </div>
            </div>
          </div>

        </div>

        {/* banda inferior */}
        <div style={{ background: VERDE, height: 4 }} />
      </div>
    </>
  )
}
