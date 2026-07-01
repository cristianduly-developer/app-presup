import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { fmt, fmtFecha } from '../../lib/fmt'

const VERDE  = '#3D5A3E'
const VERDE2 = '#f0f4f0'
const ACENTO = '#5C7A5D'
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
        .from('perfiles').select('*').eq('id', presup.user_id).single()
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
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:'sans-serif', background:'#f5f5f0' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:32, marginBottom:12 }}>📋</div>
        <div style={{ color:GRIS, fontWeight:600 }}>Preparando PDF...</div>
      </div>
    </div>
  )
  if (!p) return <div style={{ padding:40, fontFamily:'sans-serif' }}>Presupuesto no encontrado</div>

  const items   = (p.presupuesto_items || []).sort((a, b) => a.orden - b.orden)
  const totalMat = items.filter(i => i.tipo === 'material').reduce((s, i) => s + (i.subtotal || i.cantidad * i.precio_unit || 0), 0)
  const totalMO  = items.filter(i => i.tipo === 'mano_obra').reduce((s, i) => s + (i.subtotal || i.cantidad * i.precio_unit || 0), 0)
  const senia    = (perfil?.senia_activa && perfil?.senia_porcentaje > 0)
    ? Math.round(p.total * perfil.senia_porcentaje / 100) : 0

  const STATUS_LABEL = { borrador:'Borrador', enviado:'Enviado', aprobado:'Aprobado', rechazado:'Rechazado', vencido:'Vencido', en_obra:'En obra' }
  const STATUS_COLOR = { borrador:'#6B7280', enviado:'#4A7C4A', aprobado:'#2D5E2D', rechazado:'#8B2020', vencido:'#8B2020', en_obra:'#F97316' }
  const statusLabel  = STATUS_LABEL[p.status] || p.status
  const statusColor  = STATUS_COLOR[p.status] || '#6B7280'

  const profUbicacion = [perfil?.ciudad, perfil?.provincia].filter(Boolean).join(', ')
  const inicialProf   = perfil?.nombre?.charAt(0)?.toUpperCase() || '?'
  const inicialCli    = p.clientes?.nombre?.charAt(0)?.toUpperCase() || '?'

  return (
    <>
      <style>{`
        * { box-sizing:border-box; margin:0; padding:0; }
        body { background:#f0f2ed; font-family:'Helvetica Neue',Arial,sans-serif; color:${NEGRO}; }
        .print-page { background:white; }
        @media print {
          body { background:white; }
          .no-print { display:none !important; }
          @page { margin:0; size:A4; }
          .print-page { box-shadow:none !important; margin:0 !important; }
        }
      `}</style>

      {/* barra pantalla */}
      <div className="no-print" style={{ background:NEGRO, padding:'12px 24px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ color:'#9CA3AF', fontSize:13 }}>Presupuesto #{p.numero} · {perfil?.nombre}</span>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={() => window.print()}
            style={{ background:VERDE, color:'#fff', border:'none', borderRadius:8, padding:'9px 20px', fontWeight:700, fontSize:13, cursor:'pointer' }}>
            🖨 Imprimir / Guardar PDF
          </button>
          <button onClick={() => window.close()}
            style={{ background:'#374151', color:'#D1D5DB', border:'none', borderRadius:8, padding:'9px 16px', fontWeight:600, fontSize:13, cursor:'pointer' }}>
            Cerrar
          </button>
        </div>
      </div>

      <div className="print-page" style={{ maxWidth:794, margin:'24px auto', boxShadow:'0 4px 32px rgba(0,0,0,.10)' }}>

        {/* banda superior */}
        <div style={{ background:VERDE, height:5 }} />

        <div style={{ padding:'18px 32px 28px' }}>

          {/* ─── ENCABEZADO compacto ─── */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12, paddingBottom:10, borderBottom:`1px solid ${LINEA}` }}>

            {/* profesional — una sola fila */}
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              {perfil?.logo_url
                ? <img src={perfil.logo_url} alt="Logo" style={{ width:36, height:36, objectFit:'contain', borderRadius:6, border:`1px solid ${LINEA}` }} />
                : <div style={{ width:36, height:36, background:VERDE, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, color:'#fff', fontWeight:800, flexShrink:0 }}>
                    {inicialProf}
                  </div>
              }
              <div>
                <div style={{ fontSize:14, fontWeight:800, color:NEGRO }}>{perfil?.nombre || 'Profesional'}</div>
                <div style={{ fontSize:10, color:GRIS }}>
                  {[perfil?.oficio, perfil?.telefono, perfil?.cuit && `CUIT ${perfil.cuit}`, perfil?.condicion_iva].filter(Boolean).join(' · ')}
                </div>
              </div>
            </div>

            {/* número + meta en columna derecha compacta */}
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:9, fontWeight:700, color:ACENTO, letterSpacing:2, textTransform:'uppercase' }}>Presupuesto</div>
              <div style={{ fontSize:30, fontWeight:900, color:VERDE, lineHeight:1.1, letterSpacing:-0.5 }}>#{p.numero}</div>
              <div style={{ fontSize:10, color:GRIS, marginTop:2 }}>
                {fmtFecha(p.created_at)} · {p.vigencia_dias}d
                {p.fecha_vence && ` · vence ${fmtFecha(p.fecha_vence)}`}
              </div>
              <span style={{ display:'inline-block', marginTop:3, padding:'2px 10px', borderRadius:20, fontSize:9, fontWeight:700, background:statusColor+'18', color:statusColor }}>
                {statusLabel}
              </span>
            </div>
          </div>

          {/* ─── CLIENTE ─── */}
          {p.clientes && (
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8, padding:'7px 12px', background:VERDE2, border:`1px solid ${LINEA}`, borderRadius:8 }}>
              <div style={{ width:28, height:28, background:VERDE, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, color:'#fff', fontWeight:800, flexShrink:0 }}>
                {inicialCli}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <span style={{ fontWeight:800, fontSize:13, color:NEGRO }}>{p.clientes.nombre}</span>
                {(p.clientes.telefono || p.clientes.email || p.clientes.direccion) && (
                  <span style={{ fontSize:10, color:GRIS, marginLeft:8 }}>
                    {[p.clientes.telefono, p.clientes.email, p.clientes.direccion].filter(Boolean).join(' · ')}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ─── TÍTULO ─── */}
          {p.titulo && (
            <div style={{ marginBottom:10, padding:'6px 12px', borderLeft:`4px solid ${VERDE}`, background:'#fff' }}>
              <div style={{ fontSize:9, fontWeight:700, color:ACENTO, letterSpacing:2, textTransform:'uppercase', marginBottom:1 }}>Trabajo</div>
              <div style={{ fontSize:14, fontWeight:800, color:NEGRO }}>{p.titulo}</div>
            </div>
          )}

          {/* ─── TABLA ITEMS ─── */}
          <div style={{ marginBottom:16 }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ background:VERDE }}>
                  <th style={{ textAlign:'left',   padding:'9px 12px', fontSize:9, fontWeight:700, color:'#fff', letterSpacing:1.5, textTransform:'uppercase' }}>Descripción</th>
                  <th style={{ textAlign:'center', padding:'9px 12px', fontSize:9, fontWeight:700, color:'#fff', letterSpacing:1.5, textTransform:'uppercase', width:55 }}>Cant.</th>
                  <th style={{ textAlign:'right',  padding:'9px 12px', fontSize:9, fontWeight:700, color:'#fff', letterSpacing:1.5, textTransform:'uppercase', width:110 }}>P. Unit.</th>
                  <th style={{ textAlign:'right',  padding:'9px 12px', fontSize:9, fontWeight:700, color:'#fff', letterSpacing:1.5, textTransform:'uppercase', width:110 }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => item.tipo === 'seccion' ? (
                  <tr key={i}>
                    <td colSpan={4} style={{ padding:'10px 12px 6px', background:VERDE2, borderLeft:`3px solid ${VERDE}` }}>
                      <div style={{ fontWeight:700, fontSize:10, color:VERDE, textTransform:'uppercase', letterSpacing:0.5 }}>
                        {item.descripcion || 'Etapa'}
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={i} style={{ borderBottom:`1px solid ${LINEA}`, background: i % 2 === 0 ? '#fff' : '#FAFAF8' }}>
                    <td style={{ padding:'7px 10px', verticalAlign:'top' }}>
                      <div style={{ fontWeight:600, color:NEGRO, fontSize:12 }}>
                        {item.descripcion || (item.tipo === 'mano_obra' ? 'Mano de obra' : 'Material')}
                      </div>
                      {item.unidad && item.unidad !== 'global' && item.unidad !== 'u' && item.unidad !== 'un' && (
                        <div style={{ fontSize:9, color:'#9CA3AF', marginTop:1 }}>{item.unidad}</div>
                      )}
                    </td>
                    <td style={{ padding:'7px 10px', textAlign:'center', color:GRIS, fontSize:12 }}>{item.cantidad}</td>
                    <td style={{ padding:'7px 10px', textAlign:'right', color:GRIS, fontSize:12 }}>{fmt(item.precio_unit)}</td>
                    <td style={{ padding:'7px 10px', textAlign:'right', fontWeight:700, color:NEGRO, fontSize:12 }}>{fmt(item.subtotal || item.cantidad * item.precio_unit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* totales */}
            <div style={{ display:'flex', justifyContent:'flex-end', marginTop:14 }}>
              <div style={{ minWidth:280 }}>
                {items.filter(i => i.tipo === 'material').length > 1 && totalMat > 0 && (
                  <div style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', fontSize:12, color:GRIS, borderBottom:`1px solid ${LINEA}` }}>
                    <span>Subtotal materiales</span><span>{fmt(totalMat)}</span>
                  </div>
                )}
                {items.filter(i => i.tipo === 'mano_obra').length > 1 && totalMO > 0 && (
                  <div style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', fontSize:12, color:GRIS, borderBottom:`1px solid ${LINEA}` }}>
                    <span>Subtotal mano de obra</span><span>{fmt(totalMO)}</span>
                  </div>
                )}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', marginTop:8, background:VERDE, borderRadius:8 }}>
                  <span style={{ fontWeight:700, fontSize:13, color:'#fff', letterSpacing:1, textTransform:'uppercase' }}>Total</span>
                  <span style={{ fontWeight:900, fontSize:22, color:'#fff' }}>{fmt(p.total)}</span>
                </div>
                {senia > 0 && (
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 16px', marginTop:6, background:'#FEF3C7', borderRadius:8, border:'1px solid #FDE68A' }}>
                    <span style={{ fontWeight:700, fontSize:12, color:'#92400E' }}>Seña requerida ({perfil.senia_porcentaje}%)</span>
                    <span style={{ fontWeight:800, fontSize:16, color:'#92400E' }}>{fmt(senia)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ─── NOTAS ─── */}
          {p.notas_internas && (
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:9, fontWeight:700, color:ACENTO, letterSpacing:2, textTransform:'uppercase', marginBottom:5 }}>Observaciones</div>
              <div style={{ fontSize:12, color:'#374151', lineHeight:1.8, background:VERDE2, borderRadius:8, padding:'12px 16px', border:`1px solid ${LINEA}` }}>
                {p.notas_internas}
              </div>
            </div>
          )}

          {/* ─── FIRMA ─── */}
          {p.firma_imagen && (
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:9, fontWeight:700, color:ACENTO, letterSpacing:2, textTransform:'uppercase', marginBottom:10 }}>Firma del cliente</div>
              <div style={{ display:'flex', alignItems:'flex-end', gap:48 }}>
                <div>
                  <div style={{ border:`1px solid ${LINEA}`, borderRadius:8, padding:8, background:'#FAFAF8', display:'inline-block' }}>
                    <img src={p.firma_imagen} alt="Firma" style={{ height:70, maxWidth:220, display:'block' }} />
                  </div>
                  <div style={{ marginTop:5, borderTop:`1px solid ${LINEA}`, paddingTop:4 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:NEGRO }}>{p.firma_nombre || p.clientes?.nombre}</div>
                    {p.firma_fecha && <div style={{ fontSize:10, color:GRIS }}>Firmado el {new Date(p.firma_fecha).toLocaleString('es-AR')}</div>}
                  </div>
                </div>
                <div style={{ textAlign:'right', flex:1 }}>
                  <div style={{ borderTop:`1px solid ${LINEA}`, paddingTop:4, display:'inline-block', minWidth:180 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:NEGRO }}>{perfil?.nombre}</div>
                    <div style={{ fontSize:10, color:GRIS }}>Profesional</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── FOOTER ─── */}
          <div style={{ marginTop:16, paddingTop:14, borderTop:`1px solid ${LINEA}` }}>
            {(perfil?.cbu || perfil?.alias_banco) && (
              <div style={{ background:VERDE2, border:`1px solid ${LINEA}`, borderRadius:8, padding:'11px 16px', marginBottom:12, fontSize:12, color:NEGRO }}>
                <div style={{ fontWeight:700, marginBottom:4, color:VERDE }}>Datos para transferencia</div>
                {perfil.banco       && <div>Banco: <strong>{perfil.banco}</strong></div>}
                {perfil.cbu         && <div>CBU: <strong>{perfil.cbu}</strong></div>}
                {perfil.alias_banco && <div>Alias: <strong>{perfil.alias_banco}</strong></div>}
                <div style={{ marginTop:3 }}>A nombre de: <strong>{perfil.nombre}</strong>{perfil.cuit ? ` · CUIT: ${perfil.cuit}` : ''}</div>
              </div>
            )}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontSize:11, color:'#9CA3AF' }}>{perfil?.telefono && `${perfil.nombre} · ${perfil.telefono}`}</div>
              <div style={{ fontSize:10, color:'#C4C4BC' }}>Presupuesto #{p.numero} · {fmtFecha(new Date().toISOString())}</div>
            </div>
          </div>

        </div>

        <div style={{ background:VERDE, height:4 }} />
      </div>
    </>
  )
}
