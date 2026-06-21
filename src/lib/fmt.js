export const fmt = n => '$' + Number(n || 0).toLocaleString('es-AR')

export const fmtFecha = d => d ? new Date(d).toLocaleDateString('es-AR') : ''

export const fmtCorto = n => {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return '$' + (n / 1_000).toFixed(0) + 'k'
  return fmt(n)
}

export function waMe(tel) {
  const d = tel.replace(/\D/g, '')
  if (d.startsWith('54')) return `https://wa.me/${d}`
  if (d.startsWith('0'))  return `https://wa.me/54${d.slice(1)}`
  return `https://wa.me/54${d}`
}
