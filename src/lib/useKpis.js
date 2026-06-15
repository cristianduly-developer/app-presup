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
    const hoy = new Date().toISOString().split('T')[0]
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

    const en3dias = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]
    const [{ data: presups }, { data: obras }, { data: visitas }, { data: vencen }] = await Promise.all([
      supabase.from('presupuestos').select('total, status, created_at').gte('created_at', inicioMes),
      supabase.from('obras_resumen').select('*'),
      supabase.from('visitas').select('*, clientes(nombre, telefono)').eq('fecha', hoy).order('hora'),
      supabase.from('presupuestos').select('id, numero, titulo, fecha_vence, clientes(nombre)')
        .in('status', ['enviado', 'borrador'])
        .gte('fecha_vence', hoy)
        .lte('fecha_vence', en3dias)
        .order('fecha_vence'),
    ])

    const facturado = (presups || []).reduce((s, p) => s + (p.total || 0), 0)
    const obrasList = obras || []
    const cobrado = obrasList.reduce((s, o) => s + (o.cobrado || 0), 0)
    const pendiente = obrasList.reduce((s, o) => s + (o.pendiente || 0), 0)
    const gastosTotales = obrasList.reduce((s, o) => s + (o.gastos || 0), 0)
    const ganancia = cobrado - gastosTotales

    // embudo
    const statusList = ['borrador', 'enviado', 'aprobado', 'en_ejecucion', 'cobrada']
    const embudoData = [
      { label: 'Enviados',      status: 'enviado',      color: '#3B82F6' },
      { label: 'Aprobados',     status: 'aprobado',     color: '#22C55E' },
      { label: 'En ejecución',  status: 'en_ejecucion', color: '#F97316' },
      { label: 'Pend. cobro',   status: 'pendiente_cobro', color: '#A855F7' },
      { label: 'Cobrados',      status: 'cobrada',      color: '#14B8A6' },
    ].map(e => ({
      ...e,
      count: obrasList.filter(o => o.status === e.status).length,
      monto: obrasList.filter(o => o.status === e.status).reduce((s, o) => s + o.total, 0),
    }))

    const activas = obrasList.filter(o => ['en_ejecucion', 'pendiente_cobro'].includes(o.status))

    setKpis({ facturado, cobrado, pendiente, ganancia, obrasActivas: activas.length })
    setAgenda(visitas || [])
    setEmbudo(embudoData)
    setObrasEjecucion(activas)
    setPorVencer(vencen || [])
    setLoading(false)
  }

  return { kpis, agenda, embudo, obrasEjecucion, porVencer, loading, cargar }
}
