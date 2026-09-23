import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("SatQuery Application Error Boundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0f1d',
          color: '#ffffff',
          fontFamily: 'sans-serif',
          padding: '24px',
          textAlign: 'center'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '24px',
            padding: '32px',
            maxWidth: '520px',
            backdropFilter: 'blur(20px)'
          }}>
            <h2 style={{ color: '#22d3ee', fontSize: '20px', marginBottom: '12px' }}>
              SatQuery AI — Runtime Auto-Recovery
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '13px', lineHeight: '1.6', marginBottom: '20px' }}>
              A temporary display exception occurred while rendering the geospatial layer.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              style={{
                background: '#06b6d4',
                color: '#000000',
                fontWeight: 'bold',
                border: 'none',
                borderRadius: '9999px',
                padding: '10px 24px',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              Reset Cockpit
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
