import { createContext, useContext } from 'react'

export const PlanContext = createContext('basico')
export const usePlan = () => useContext(PlanContext)

export const LIMITES = {
  basico:      { presupuestos: 50,       obras: 30 },
  profesional: { presupuestos: 200,      obras: 100 },
  premium:     { presupuestos: Infinity, obras: Infinity },
  // demo y sincargo tienen los mismos límites que profesional
  demo:        { presupuestos: 200,      obras: 100 },
}

export const FEATURES_PLAN = {
  plantillas:   ['profesional', 'premium', 'demo'],
  estadisticas: ['profesional', 'premium', 'demo'],
  pdf:          ['profesional', 'premium', 'demo'],
  equipo:       ['premium'],
}

export function tieneFeature(plan, feature) {
  return FEATURES_PLAN[feature]?.includes(plan) ?? false
}
