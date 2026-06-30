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

        <div style={{ padding:'36px 44px 44px' }}>

          {/* ─── ENCABEZADO: profesional izq, presupuesto der ─── */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28, paddingBottom:24, borderBottom:`1px solid ${LINEA}` }}>

            {/* profesional */}
            <div style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
              {perfil?.logo_url
                ? <img src={perfil.logo_url} alt="Logo" style={{ width:60, height:60, objectFit:'contain', borderRadius:10, border:`1px solid ${LINEA}` }} />
                : <div style={{ width:60, height:60, background:VERDE, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, color:'#fff', fontWeight:800, flexShrink:0 }}>
                    {inicialProf}
                  </div>
              }
              <div>
                <div style={{ fontSize:18, fontWeight:800, color:NEGRO, marginBottom:2 }}>{perfil?.nombre || 'Profesional'}</div>
                {perfil?.oficio && <div style={{ fontSize:10, color:ACENTO, fontWeight:700, textTransform:'uppercase', letterSpacing:0.8, marginBottom:6 }}>
                  {perfil.oficio.charAt(0).toUpperCase() + perfil.oficio.slice(1)}
                </div>}
                <div style={{ fontSize:11, color:GRIS, lineHeight:1.9 }}>
                  {profUbicacion  && <div>{profUbicacion}</div>}
                  {perfil?.telefono && <div>{perfil.telefono}</div>}
                  {perfil?.cuit    && <div>CUIT {perfil.cuit}</div>}
                  {perfil?.condicion_iva && <div>{perfil.condicion_iva.charAt(0).toUpperCase() + perfil.condicion_iva.slice(1)}</div>}
                  {perfil?.matricula && <div>Mat. {perfil.matricula}</div>}
                </div>
              </div>
            </div>

            {/* número + fechas */}
            <div style={{ textAlign:'right', minWidth:180 }}>
              <div style={{ fontSize:9, fontWeight:700, color:ACENTO, letterSpacing:2.5, textTransform:'uppercase', marginBottom:2 }}>Presupuesto</div>
              <div style={{ fontSize:46, fontWeight:900, color:VERDE, lineHeight:1, marginBottom:8, letterSpacing:-1 }}>#{p.numero}</div>
              <div style={{ fontSize:11, color:GRIS, lineHeight:2 }}>
                <div>Fecha: <strong style={{ color:NEGRO }}>{fmtFecha(p.created_at)}</strong></div>
                <div>Validez: <strong style={{ color:NEGRO }}>{p.vigencia_dias} días</strong></div>
                {p.fecha_vence && <div>Vence: <strong style={{ color:NEGRO }}>{fmtFecha(p.fecha_vence)}</strong></div>}
              </div>
              <div style={{ marginTop:8, display:'inline-block', padding:'3px 12px', borderRadius:20, fontSize:10, fontWeight:700, background:statusColor+'18', color:statusColor, border:`1px solid ${statusColor}33` }}>
                {statusLabel}
              </div>
            </div>
          </div>

          {/* ─── CLIENTE ─── */}
          {p.clientes && (
            <div style={{ marginBottom:24 }}>
              <div style={{ fontSize:9, fontWeight:700, color:ACENTO, letterSpacing:2, textTransform:'uppercase', marginBottom:10 }}>Cliente</div>
              <div style={{ background:VERDE2, border:`1px solid ${LINEA}`, borderRadius:10, padding:'14px 20px', display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ width:40, height:40, borderRadius:'50%', background:VERDE, display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, fontWeight:800, color:'#fff', flexShrink:0 }}>
                  {inicialCli}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:800, fontSize:15, color:NEGRO, marginBottom:3 }}>{p.clientes.nombre}</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:'4px 24px', fontSize:11, color:GRIS }}>
                    {p.clientes.telefono  && <span>☎ {p.clientes.telefono}</span>}
                    {p.clientes.email     && <span>✉ {p.clientes.email}</span>}
                    {p.clientes.direccion && <span>📍 {p.clientes.direccion}</span>}
                    {p.clientes.cuit      && <span>CUIT {p.clientes.cuit}</span>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── TÍTULO DEL TRABAJO ─── */}
          {p.titulo && (
            <div style={{ marginBottom:24, padding:'12px 20px', background:'#fff', border:`1px solid ${LINEA}`, borderLeft:`4px solid ${VERDE}`, borderRadius:6 }}>
              <div style={{ fontSize:9, fontWeight:700, color:ACENTO, letterSpacing:2, textTransform:'uppercase', marginBottom:4 }}>Trabajo</div>
              <div style={{ fontSize:16, fontWeight:800, color:NEGRO }}>{p.titulo}</div>
            </div>
          )}

          {/* ─── TABLA ITEMS ─── */}
          <div style={{ marginBottom:24 }}>
            <div style={{ fontSize:9, fontWeight:700, color:ACENTO, letterSpacing:2, textTransform:'uppercase', marginBottom:10 }}>Detalle</div>
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
                    <td style={{ padding:'10px 12px', verticalAlign:'top' }}>
                      <div style={{ fontWeight:600, color:NEGRO }}>
                        {item.descripcion || (item.tipo === 'mano_obra' ? 'Mano de obra' : 'Material')}
                      </div>
                      {item.unidad && item.unidad !== 'global' && (
                        <div style={{ fontSize:10, color:'#9CA3AF', marginTop:2 }}>{item.unidad}</div>
                      )}
                    </td>
                    <td style={{ padding:'10px 12px', textAlign:'center', color:GRIS }}>{item.cantidad}</td>
                    <td style={{ padding:'10px 12px', textAlign:'right', color:GRIS }}>{fmt(item.precio_unit)}</td>
                    <td style={{ padding:'10px 12px', textAlign:'right', fontWeight:700, color:NEGRO }}>{fmt(item.subtotal || item.cantidad * item.precio_unit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* totales */}
            <div style={{ display:'flex', justifyContent:'flex-end', marginTop:14 }}>
              <div style={{ minWidth:280 }}>
                {totalMat > 0 && (
                  <div style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', fontSize:12, color:GRIS, borderBottom:`1px solid ${LINEA}` }}>
                    <span>Subtotal materiales</span><span>{fmt(totalMat)}</span>
                  </div>
                )}
                {totalMO > 0 && (
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
            <div style={{ marginBottom:24 }}>
              <div style={{ fontSize:9, fontWeight:700, color:ACENTO, letterSpacing:2, textTransform:'uppercase', marginBottom:8 }}>Observaciones</div>
              <div style={{ fontSize:12, color:'#374151', lineHeight:1.8, background:VERDE2, borderRadius:8, padding:'12px 16px', border:`1px solid ${LINEA}` }}>
                {p.notas_internas}
              </div>
            </div>
          )}

          {/* ─── FIRMA ─── */}
          {p.firma_imagen && (
            <div style={{ marginBottom:24 }}>
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
          <div style={{ marginTop:28, paddingTop:18, borderTop:`1px solid ${LINEA}` }}>
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
