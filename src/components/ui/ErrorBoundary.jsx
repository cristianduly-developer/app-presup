import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) { return { error } }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack)
  }

  render() {
    if (this.state.error) return (
      <div className="flex flex-col items-center justify-center gap-4 px-6"
        style={{ minHeight: '60vh', background: '#0D0D14' }}>
        <span className="text-5xl">⚠️</span>
        <p className="text-white font-bold text-[18px]">Algo salió mal</p>
        <p className="text-gray-500 text-[13px] text-center">
          {this.state.error.message || 'Error inesperado'}
        </p>
        <button
          onClick={() => this.setState({ error: null })}
          className="mt-2 px-6 py-3 rounded-2xl text-white font-semibold text-[14px]"
          style={{ background: '#3B82F6' }}>
          Reintentar
        </button>
      </div>
    )
    return this.props.children
  }
}
