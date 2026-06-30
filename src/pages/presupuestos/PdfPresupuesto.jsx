import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { fmt, fmtFecha } from '../../lib/fmt'

const AZUL  = '#1D4ED8'
const AZUL2 = '#EFF6FF'
const GRIS  = '#6B7280'
const NEGRO = '#111827'

export default function PdfPresupuesto() {
  const { id } = useParams()
  const [p, setP]         = useState(null)
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif', background: '#f3f4f6' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
        <div style={{ color: GRIS, fontWeight: 600 }}>Preparando PDF...</div>
      </div>
    </div>
  )
  if (!p) return <div style={{ padding: 40, fontFamily: 'sans-serif' }}>Presupuesto no encontrado</div>

  const items   = (p.presupuesto_items || []).sort((a, b) => a.orden - b.orden)
  const totalMat = items.filter(i => i.tipo === 'material').reduce((s, i) => s + (i.subtotal || i.cantidad * i.precio_unit || 0), 0)
  const totalMO  = items.filter(i => i.tipo === 'mano_obra').reduce((s, i) => s + (i.subtotal || i.cantidad * i.precio_unit || 0), 0)

  const STATUS_COLOR = { borrador: '#6B7280', enviado: AZUL, aprobado: '#16A34A', rechazado: '#DC2626', vencido: '#DC2626' }
  const STATUS_LABEL = { borrador: 'Borrador', enviado: 'Enviado', aprobado: 'Aprobado', rechazado: 'Rechazado', vencido: 'Vencido' }
  const statusColor  = STATUS_COLOR[p.status] || '#6B7280'
  const statusLabel  = STATUS_LABEL[p.status] || p.status

  const profUbicacion = [perfil?.ciudad, perfil?.provincia].filter(Boolean).join(', ')

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #f3f4f6; font-family: 'Helvetica Neue', Arial, sans-serif; }
        .print-page { background: white; }
        @media print {
          body { background: white; }
          .no-print { display: none !important; }
          @page { margin: 0; size: A4; }
          .print-page { box-shadow: none; }
        }
      `}</style>

      {/* barra superior — solo pantalla */}
      <div className="no-print" style={{ background: NEGRO, padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#9CA3AF', fontSize: 13 }}>Presupuesto #{p.numero} · {perfil?.nombre}</span>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => window.print()}
            style={{ background: AZUL, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            🖨 Imprimir / Guardar PDF
          </button>
          <button onClick={() => window.close()}
            style={{ background: '#374151', color: '#D1D5DB', border: 'none', borderRadius: 8, padding: '9px 16px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            Cerrar
          </button>
        </div>
      </div>

      <div className="print-page" style={{ maxWidth: 800, margin: '0 auto', minHeight: '100vh' }}>

        {/* franja de color superior */}
        <div style={{ background: AZUL, height: 6 }} />

        <div style={{ padding: '36px 48px 48px' }}>

          {/* HEADER */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36, paddingBottom: 28, borderBottom: `1px solid #E5E7EB` }}>

            {/* logo + datos profesional */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              {perfil?.logo_url
                ? <img src={perfil.logo_url} alt="Logo" style={{ width: 72, height: 72, objectFit: 'contain', borderRadius: 14, border: '1px solid #E5E7EB' }} />
                : <div style={{ width: 72, height: 72, background: AZUL, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, color: '#fff', flexShrink: 0 }}>
                    {perfil?.nombre?.charAt(0)?.toUpperCase() || '🔧'}
                  </div>
              }
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: NEGRO, marginBottom: 3 }}>{perfil?.nombre || 'Profesional'}</div>
                {perfil?.oficio && <div style={{ fontSize: 12, color: GRIS, marginBottom: 6 }}>{perfil.oficio.charAt(0).toUpperCase() + perfil.oficio.slice(1)}</div>}
                <div style={{ fontSize: 11, color: '#9CA3AF', lineHeight: 1.8 }}>
                  {profUbicacion && <div>📍 {profUbicacion}</div>}
                  {perfil?.telefono && <div>📞 {perfil.telefono}</div>}
                  {perfil?.cuit && <div>CUIT: {perfil.cuit}</div>}
                  {perfil?.condicion_iva && <div>{perfil.condicion_iva.charAt(0).toUpperCase() + perfil.condicion_iva.slice(1)}</div>}
                  {perfil?.matricula && <div>Mat. {perfil.matricula}</div>}
                </div>
              </div>
            </div>

            {/* número + estado */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: GRIS, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>Presupuesto</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: AZUL, lineHeight: 1, marginBottom: 4 }}>#{p.numero}</div>
              {p.titulo && <div style={{ fontSize: 14, fontWeight: 700, color: NEGRO, marginBottom: 6 }}>{p.titulo}</div>}
              <div style={{ fontSize: 11, color: GRIS, marginBottom: 8 }}>Fecha: {fmtFecha(p.created_at)}</div>
              <div style={{ display: 'inline-block', padding: '4px 14px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: statusColor + '18', color: statusColor }}>
                {statusLabel}
              </div>
            </div>
          </div>

          {/* CLIENTE */}
          {p.clientes && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: GRIS, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>Presupuesto para</div>
              <div style={{ borderRadius: 12, border: `1.5px solid ${AZUL}22`, overflow: 'hidden' }}>
                {/* franja superior del cliente */}
                <div style={{ background: AZUL, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                    {p.clientes.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: '#fff' }}>{p.clientes.nombre}</div>
                    {p.clientes.cuit && <div style={{ fontSize: 11, color: 'rgba(255,255,255,.75)' }}>CUIT: {p.clientes.cuit}</div>}
                  </div>
                </div>
                {/* datos de contacto */}
                <div style={{ background: '#F9FAFB', padding: '14px 20px', display: 'flex', flexWrap: 'wrap', gap: '10px 32px' }}>
                  {p.clientes.telefono && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 24, height: 24, borderRadius: 6, background: AZUL + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>📞</div>
                      <span style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>{p.clientes.telefono}</span>
                    </div>
                  )}
                  {p.clientes.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 24, height: 24, borderRadius: 6, background: AZUL + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>✉️</div>
                      <span style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>{p.clientes.email}</span>
                    </div>
                  )}
                  {p.clientes.direccion && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 24, height: 24, borderRadius: 6, background: AZUL + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>📍</div>
                      <span style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>{p.clientes.direccion}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ITEMS */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: GRIS, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>Detalle del presupuesto</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${AZUL}` }}>
                  <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 10, fontWeight: 700, color: AZUL, letterSpacing: 1, textTransform: 'uppercase' }}>Descripción</th>
                  <th style={{ textAlign: 'center', padding: '8px 10px', fontSize: 10, fontWeight: 700, color: AZUL, letterSpacing: 1, textTransform: 'uppercase', width: 60 }}>Cant.</th>
                  <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 10, fontWeight: 700, color: AZUL, letterSpacing: 1, textTransform: 'uppercase', width: 110 }}>P. Unit.</th>
                  <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: 10, fontWeight: 700, color: AZUL, letterSpacing: 1, textTransform: 'uppercase', width: 110 }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => item.tipo === 'seccion' ? (
                  <tr key={i}>
                    <td colSpan={4} style={{ padding: '12px 10px 6px', background: AZUL2, borderLeft: `3px solid ${AZUL}` }}>
                      <div style={{ fontWeight: 800, fontSize: 11, color: AZUL, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                        {item.descripcion || 'Etapa'}
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={i} style={{ borderBottom: '1px solid #F3F4F6', background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    <td style={{ padding: '11px 10px', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 600, color: NEGRO }}>
                        {item.descripcion || (item.tipo === 'mano_obra' ? 'Mano de obra' : 'Material')}
                      </div>
                      <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>
                        {item.tipo === 'material' ? '🔧 Material' : '👷 Mano de obra'}{item.unidad && item.unidad !== 'global' ? ` · ${item.unidad}` : ''}
                      </div>
                    </td>
                    <td style={{ padding: '11px 10px', textAlign: 'center', color: GRIS }}>{item.cantidad}</td>
                    <td style={{ padding: '11px 10px', textAlign: 'right', color: GRIS }}>{fmt(item.precio_unit)}</td>
                    <td style={{ padding: '11px 10px', textAlign: 'right', fontWeight: 700, color: NEGRO }}>{fmt(item.subtotal || item.cantidad * item.precio_unit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* totales */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <div style={{ minWidth: 260 }}>
                {totalMat > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 12, color: GRIS }}>
                    <span>Subtotal materiales</span><span>{fmt(totalMat)}</span>
                  </div>
                )}
                {totalMO > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 12, color: GRIS }}>
                    <span>Subtotal mano de obra</span><span>{fmt(totalMO)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', marginTop: 8, background: AZUL, borderRadius: 10 }}>
                  <span style={{ fontWeight: 800, fontSize: 14, color: '#fff', letterSpacing: 0.5 }}>TOTAL</span>
                  <span style={{ fontWeight: 900, fontSize: 20, color: '#fff' }}>{fmt(p.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* NOTAS */}
          {p.notas_internas && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: GRIS, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>Observaciones</div>
              <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.8, background: '#FFFBEB', borderRadius: 10, padding: '12px 16px', border: '1px solid #FDE68A' }}>
                {p.notas_internas}
              </div>
            </div>
          )}

          {/* FIRMA */}
          {p.firma_imagen && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: GRIS, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>Firma del cliente</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 40 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ border: '1px solid #E5E7EB', borderRadius: 10, padding: 8, background: '#F9FAFB', display: 'inline-block' }}>
                    <img src={p.firma_imagen} alt="Firma" style={{ height: 80, maxWidth: 260, display: 'block' }} />
                  </div>
                  <div style={{ marginTop: 6, borderTop: '1px solid #D1D5DB', paddingTop: 4 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: NEGRO }}>{p.firma_nombre || p.clientes?.nombre || 'Cliente'}</div>
                    {p.firma_fecha && <div style={{ fontSize: 10, color: GRIS }}>Firmado el {new Date(p.firma_fecha).toLocaleString('es-AR')}</div>}
                  </div>
                </div>
                <div style={{ flex: 1, textAlign: 'right' }}>
                  <div style={{ borderTop: '1px solid #D1D5DB', paddingTop: 4, display: 'inline-block', minWidth: 200 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: NEGRO }}>{perfil?.nombre}</div>
                    <div style={{ fontSize: 10, color: GRIS }}>Profesional</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FOOTER */}
          <div style={{ marginTop: 36, paddingTop: 24, borderTop: '1px solid #E5E7EB' }}>

            <div style={{ background: AZUL2, border: `1px solid #BFDBFE`, borderRadius: 10, padding: '12px 18px', marginBottom: 16, fontSize: 12, color: '#1E40AF', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16 }}>📅</span>
              <span><strong>Presupuesto válido por {p.vigencia_dias} días</strong>{p.fecha_vence ? ` · Vence el ${fmtFecha(p.fecha_vence)}` : ''}</span>
            </div>

            {(perfil?.cbu || perfil?.alias_banco) && (
              <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '12px 18px', marginBottom: 16, fontSize: 12, color: '#14532D' }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>💳 Datos para transferencia</div>
                {perfil.banco && <div>Banco: <strong>{perfil.banco}</strong></div>}
                {perfil.cbu && <div>CBU: <strong>{perfil.cbu}</strong></div>}
                {perfil.alias_banco && <div>Alias: <strong>{perfil.alias_banco}</strong></div>}
                <div style={{ marginTop: 4 }}>A nombre de: <strong>{perfil.nombre}</strong>{perfil.cuit ? ` · CUIT: ${perfil.cuit}` : ''}</div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
              <div style={{ fontSize: 11, color: '#9CA3AF' }}>
                {perfil?.telefono && `Consultas: ${perfil.nombre} · ${perfil.telefono}`}
              </div>
              <div style={{ fontSize: 10, color: '#D1D5DB' }}>
                Presupuesto #{p.numero} · Generado el {fmtFecha(new Date().toISOString())}
              </div>
            </div>
          </div>

        </div>

        {/* franja inferior */}
        <div style={{ background: AZUL, height: 4 }} />
      </div>
    </>
  )
}
