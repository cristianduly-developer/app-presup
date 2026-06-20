// Sistema de toasts global — usar showToast(msg, 'success'|'error'|'info') desde cualquier parte
export function showToast(msg, type = 'success') {
  window.dispatchEvent(new CustomEvent('app:toast', { detail: { msg, type } }))
}
