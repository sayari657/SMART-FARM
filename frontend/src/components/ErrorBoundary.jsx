import React from 'react';

export default class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100vh', gap: 16,
          background: '#0f1117', color: '#e5e7eb', fontFamily: 'Inter, sans-serif',
        }}>
          <span style={{ fontSize: 48 }}>🌿</span>
          <h2 style={{ margin: 0, fontSize: 20 }}>Une erreur est survenue</h2>
          <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>
            {this.state.error?.message || 'Erreur inattendue'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 8, padding: '10px 24px', borderRadius: 8,
              background: '#22c55e', color: '#000', border: 'none',
              fontWeight: 700, cursor: 'pointer', fontSize: 14,
            }}
          >
            Recharger la page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
