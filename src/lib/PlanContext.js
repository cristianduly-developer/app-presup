import { createContext, useContext } from 'react'

export const PlanContext = createContext('basico')
export const usePlan = () => useContext(PlanContext)

export const LIMITES = {
  basico:      { presupuestos: 20,       obras: 20 },
  profesional: { presupuestos: Infinity, obras: Infinity },
  premium:     { presupuestos: Infinity, obras: Infinity },
  demo:        { presupuestos: Infinity, obras: Infinity },
}

export const FEATURES_PLAN = {
  plantillas:   ['basico', 'profesional', 'premium', 'demo'],
  estadisticas: ['profesional', 'premium', 'demo'],
  pdf:          ['basico', 'profesional', 'premium', 'demo'],
  equipo:       ['premium'],
}

export function tieneFeature(plan, feature) {
  return FEATURES_PLAN[feature]?.includes(plan) ?? false
}
