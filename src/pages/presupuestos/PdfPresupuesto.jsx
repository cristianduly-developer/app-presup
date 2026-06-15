import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

function fmt(n) { return '$' + Number(n || 0).toLocaleString('es-AR') }
function fmtFecha(d) { return d ? new Date(d).toLocaleDateString('es-AR') : '' }

export default function PdfPresupuesto() {
  const { id } = useParams()
  const [p, setP] = useState(null)
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
      Preparando PDF...
    </div>
  )
  if (!p) return <div style={{ padding: 40, fontFamily: 'sans-serif' }}>Presupuesto no encontrado</div>

  const items = (p.presupuesto_items || []).sort((a, b) => a.orden - b.orden)
  const totalMat = items.filter(i => i.tipo === 'material').reduce((s, i) => s + (i.subtotal || i.cantidad * i.precio_unit || 0), 0)
  const totalMO  = items.filter(i => i.tipo === 'mano_obra').reduce((s, i) => s + (i.subtotal || i.cantidad * i.precio_unit || 0), 0)

  const s = {
    page:    { fontFamily: 'Arial, sans-serif', fontSize: 13, color: '#1a1a1a', maxWidth: 800, margin: '0 auto', padding: '40px 40px 60px' },
    header:  { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, paddingBottom: 24, borderBottom: '2px solid #1a1a1a' },
    logo:    { width: 70, height: 70, objectFit: 'contain', borderRadius: 12 },
    logoPlaceholder: { width: 70, height: 70, background: '#3B82F6', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, color: '#fff' },
    profNombre: { fontSize: 20, fontWeight: 700, marginBottom: 4 },
    profInfo:   { fontSize: 11, color: '#555', lineHeight: 1.7 },
    presupTitulo: { textAlign: 'right' },
    presupNum:  { fontSize: 28, fontWeight: 700, color: '#1a1a1a' },
    presupSub:  { fontSize: 11, color: '#888', marginTop: 4 },
    badge:      { display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, marginTop: 8 },
    section:    { marginBottom: 24 },
    sectionTitle: { fontSize: 10, fontWeight: 700, color: '#888', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10, paddingBottom: 4, borderBottom: '1px solid #e5e5e5' },
    clienteCard: { background: '#f8f8f8', borderRadius: 10, padding: '14px 18px' },
    table:      { width: '100%', borderCollapse: 'collapse' },
    th:         { textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#888', letterSpacing: 1, textTransform: 'uppercase', padding: '8px 10px', borderBottom: '1px solid #e5e5e5' },
    thRight:    { textAlign: 'right', fontSize: 10, fontWeight: 700, color: '#888', letterSpacing: 1, textTransform: 'uppercase', padding: '8px 10px', borderBottom: '1px solid #e5e5e5' },
    td:         { padding: '10px 10px', borderBottom: '1px solid #f0f0f0', fontSize: 13, verticalAlign: 'top' },
    tdRight:    { padding: '10px 10px', borderBottom: '1px solid #f0f0f0', fontSize: 13, textAlign: 'right', fontWeight: 500 },
    tdSub:      { fontSize: 10, color: '#999', marginTop: 2 },
    totalesBox: { marginTop: 16, display: 'flex', justifyContent: 'flex-end' },
    totalesInner: { minWidth: 240 },
    totRow:     { display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13, color: '#555' },
    totRowFinal:{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', marginTop: 6, borderTop: '2px solid #1a1a1a', fontSize: 17, fontWeight: 700, color: '#1a1a1a' },
    footer:     { marginTop: 40, paddingTop: 20, borderTop: '1px solid #e5e5e5' },
    validez:    { background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '12px 18px', fontSize: 12, color: '#1e40af', marginBottom: 16 },
    footerText: { fontSize: 10, color: '#aaa', textAlign: 'center', marginTop: 12 },
  }

  const STATUS_COLOR = { borrador: '#6B7280', enviado: '#3B82F6', aprobado: '#22C55E', vencido: '#EF4444' }
  const STATUS_LABEL = { borrador: 'Borrador', enviado: 'Enviado', aprobado: 'Aprobado', vencido: 'Vencido' }

  return (
    <>
      <style>{`
        @media print {
          body { margin: 0; }
          @page { margin: 20mm; size: A4; }
          button.no-print { display: none !important; }
        }
        body { background: #f5f5f5; }
        .print-page { background: white; box-shadow: 0 2px 20px rgba(0,0,0,.1); }
      `}</style>

      {/* botón imprimir — solo visible en pantalla */}
      <div style={{ background: '#1a1a1a', padding: '12px 20px', display: 'flex', justifyContent: 'flex-end', gap: 10 }} className="no-print">
        <button onClick={() => window.print()}
          style={{ background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 24px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          🖨 Imprimir / Guardar PDF
        </button>
        <button onClick={() => window.close()}
          style={{ background: '#333', color: '#aaa', border: 'none', borderRadius: 10, padding: '10px 18px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
          Cerrar
        </button>
      </div>

      <div className="print-page" style={s.page}>

        {/* HEADER */}
        <div style={s.header}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            {perfil?.logo_url
              ? <img src={perfil.logo_url} alt="Logo" style={s.logo} />
              : <div style={s.logoPlaceholder}>🔧</div>
            }
            <div>
              <div style={s.profNombre}>{perfil?.nombre || 'Profesional'}</div>
              <div style={s.profInfo}>
                {perfil?.oficio && <div>{perfil.oficio.charAt(0).toUpperCase() + perfil.oficio.slice(1)}</div>}
                {perfil?.matricula && <div>Matrícula: {perfil.matricula}</div>}
                {perfil?.cuit && <div>CUIT: {perfil.cuit}</div>}
                {perfil?.condicion_iva && <div>{perfil.condicion_iva.charAt(0).toUpperCase() + perfil.condicion_iva.slice(1)}</div>}
                {perfil?.telefono && <div>Tel: {perfil.telefono}</div>}
                {perfil?.ciudad && <div>{perfil.ciudad}{perfil.provincia ? `, ${perfil.provincia}` : ''}</div>}
              </div>
            </div>
          </div>
          <div style={s.presupTitulo}>
            <div style={{ fontSize: 11, color: '#888', fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase' }}>Presupuesto</div>
            <div style={s.presupNum}>#{p.numero}</div>
            {p.titulo && <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginTop: 4 }}>{p.titulo}</div>}
            <div style={s.presupSub}>Fecha: {fmtFecha(p.created_at)}</div>
            <div style={{ ...s.badge, background: (STATUS_COLOR[p.status] || '#6B7280') + '20', color: STATUS_COLOR[p.status] || '#6B7280' }}>
              {STATUS_LABEL[p.status] || p.status}
            </div>
          </div>
        </div>

        {/* CLIENTE */}
        {p.clientes && (
          <div style={s.section}>
            <div style={s.sectionTitle}>Cliente</div>
            <div style={s.clienteCard}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{p.clientes.nombre}</div>
              <div style={{ fontSize: 12, color: '#555', lineHeight: 1.8 }}>
                {p.clientes.telefono && <span>Tel: {p.clientes.telefono} &nbsp;</span>}
                {p.clientes.email && <span>Email: {p.clientes.email} &nbsp;</span>}
                {p.clientes.direccion && <span>Dir: {p.clientes.direccion} &nbsp;</span>}
                {p.clientes.cuit && <span>CUIT: {p.clientes.cuit}</span>}
              </div>
            </div>
          </div>
        )}

        {/* ITEMS */}
        <div style={s.section}>
          <div style={s.sectionTitle}>Detalle del presupuesto</div>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Descripción</th>
                <th style={{ ...s.th, textAlign: 'center', width: 60 }}>Cant.</th>
                <th style={{ ...s.thRight, width: 100 }}>P. Unit.</th>
                <th style={{ ...s.thRight, width: 110 }}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={s.td}>
                    <div>{item.descripcion}</div>
                    <div style={s.tdSub}>{item.tipo === 'material' ? '🔧 Material' : '👷 Mano de obra'} · {item.unidad}</div>
                  </td>
                  <td style={{ ...s.td, textAlign: 'center' }}>{item.cantidad}</td>
                  <td style={s.tdRight}>{fmt(item.precio_unit)}</td>
                  <td style={s.tdRight}>{fmt(item.subtotal || item.cantidad * item.precio_unit)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* totales */}
          <div style={s.totalesBox}>
            <div style={s.totalesInner}>
              {totalMat > 0 && (
                <div style={s.totRow}>
                  <span>Subtotal materiales</span>
                  <span>{fmt(totalMat)}</span>
                </div>
              )}
              {totalMO > 0 && (
                <div style={s.totRow}>
                  <span>Subtotal mano de obra</span>
                  <span>{fmt(totalMO)}</span>
                </div>
              )}
              <div style={s.totRowFinal}>
                <span>TOTAL</span>
                <span>{fmt(p.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* NOTAS */}
        {p.notas_internas && (
          <div style={{ ...s.section, marginBottom: 32 }}>
            <div style={s.sectionTitle}>Observaciones</div>
            <div style={{ fontSize: 12, color: '#444', lineHeight: 1.7, background: '#fffbeb', borderRadius: 8, padding: '10px 14px', border: '1px solid #fde68a' }}>
              {p.notas_internas}
            </div>
          </div>
        )}

        {/* FIRMA */}
        {p.firma_imagen && (
          <div style={{ ...s.section, marginBottom: 32 }}>
            <div style={s.sectionTitle}>Firma del cliente</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 40 }}>
              <div style={{ flex: 1 }}>
                <div style={{ border: '1px solid #e5e5e5', borderRadius: 8, padding: 8, background: '#fafafa', display: 'inline-block' }}>
                  <img src={p.firma_imagen} alt="Firma" style={{ height: 80, maxWidth: 280, display: 'block' }} />
                </div>
                <div style={{ marginTop: 6, borderTop: '1px solid #ccc', paddingTop: 4 }}>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{p.firma_nombre || p.clientes?.nombre || 'Cliente'}</div>
                  {p.firma_fecha && (
                    <div style={{ fontSize: 10, color: '#888' }}>
                      Firmado digitalmente el {new Date(p.firma_fecha).toLocaleString('es-AR')}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ flex: 1, textAlign: 'right' }}>
                <div style={{ borderTop: '1px solid #ccc', paddingTop: 4, display: 'inline-block', minWidth: 200 }}>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{perfil?.nombre || ''}</div>
                  <div style={{ fontSize: 10, color: '#888' }}>Profesional</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div style={s.footer}>
          <div style={s.validez}>
            📅 <strong>Presupuesto válido por {p.vigencia_dias} días</strong>
            {p.fecha_vence && ` · Vence el ${fmtFecha(p.fecha_vence)}`}
          </div>

          {/* datos de pago */}
          {(perfil?.cbu || perfil?.alias_banco) && (
            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '12px 18px', marginBottom: 16, fontSize: 12, color: '#14532D' }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>💳 Datos para transferencia</div>
              {perfil.banco && <div>Banco: <strong>{perfil.banco}</strong></div>}
              {perfil.cbu && <div>CBU: <strong>{perfil.cbu}</strong></div>}
              {perfil.alias_banco && <div>Alias: <strong>{perfil.alias_banco}</strong></div>}
              <div style={{ marginTop: 4, color: '#166534' }}>A nombre de: <strong>{perfil.nombre}</strong>{perfil.cuit ? ` · CUIT: ${perfil.cuit}` : ''}</div>
            </div>
          )}

          {perfil?.telefono && (
            <div style={{ fontSize: 12, color: '#555', marginBottom: 8 }}>
              Consultas: {perfil.nombre} · {perfil.telefono}
            </div>
          )}
          <div style={s.footerText}>
            Presupuesto #{p.numero} · {perfil?.nombre} · Generado el {fmtFecha(new Date().toISOString())}
          </div>
        </div>
      </div>
    </>
  )
}
