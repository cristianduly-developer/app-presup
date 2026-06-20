import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export function useKpis() {
  const [kpis, setKpis] = useState({ facturado: 0, cobrado: 0, pendiente: 0, ganancia: 0, obrasActivas: 0 })
  const [agenda, setAgenda] = useState([])
  const [obrasEjecucion, setObrasEjecucion] = useState([])
  const [embudo, setEmbudo] = useState([])
  const [porVencer, setPorVencer] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)

    const { data, error } = await supabase.rpc('get_dashboard_kpis')

    if (error || !data) {
      console.error('[useKpis]', error)
      setLoading(false)
      return
    }

    const obras = data.obras || []
    const visitas = data.visitas || []

    // Embudo: necesita presupuestos + obras por status
    const { data: presups } = await supabase
      .from('presupuestos')
      .select('status, total')

    const embudoData = [
      { label: 'Enviados',     status: 'enviado',         color: '#3B82F6' },
      { label: 'Aprobados',    status: 'aprobado',        color: '#22C55E' },
      { label: 'En ejecución', status: 'en_ejecucion',    color: '#F97316' },
      { label: 'Pend. cobro',  status: 'pendiente_cobro', color: '#A855F7' },
      { label: 'Cobrados',     status: 'cobrada',         color: '#14B8A6' },
    ].map(e => {
      const source = ['en_ejecucion', 'pendiente_cobro', 'cobrada'].includes(e.status)
        ? obras
        : (presups || [])
      return {
        ...e,
        count: source.filter(o => o.status === e.status).length,
        monto: source.filter(o => o.status === e.status).reduce((s, o) => s + (o.total || 0), 0),
      }
    })

    // Visitas: adaptar estructura plana a la que espera Inicio
    const visitsFormated = visitas.map(v => ({
      ...v,
      clientes: v.cliente_nombre ? { nombre: v.cliente_nombre, telefono: v.cliente_telefono } : null,
    }))

    // Por vencer: adaptar estructura
    const porVencerFormated = (data.por_vencer || []).map(p => ({
      ...p,
      clientes: p.cliente_nombre ? { nombre: p.cliente_nombre } : null,
    }))

    setKpis({
      facturado: data.facturado || 0,
      cobrado:   data.cobrado   || 0,
      pendiente: data.pendiente || 0,
      ganancia:  data.ganancia  || 0,
      obrasActivas: obras.length,
    })
    setAgenda(visitsFormated)
    setEmbudo(embudoData)
    setObrasEjecucion(obras)
    setPorVencer(porVencerFormated)
    setLoading(false)
  }

  return { kpis, agenda, embudo, obrasEjecucion, porVencer, loading, cargar }
}
