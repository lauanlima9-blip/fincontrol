import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Erro inesperado ao carregar a tela.' }
  }

  componentDidCatch(error, info) {
    console.error('Erro capturado na página:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="feature-page fade-in">
          <div className="empty-state error-state">
            <h2>Não foi possível carregar esta tela</h2>
            <p>{this.state.message}</p>
            <button className="btn-save" onClick={() => window.location.reload()}>Recarregar</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
