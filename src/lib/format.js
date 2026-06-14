export function formatMoney(n) {
  if (!n && n !== 0) return '$0'
  return '$' + Number(n).toLocaleString('es-AR')
}

export function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatHours(h) {
  if (!h && h !== 0) return '0 h'
  return `${h} h`
}
