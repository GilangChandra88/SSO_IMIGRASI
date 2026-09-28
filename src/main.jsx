import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: '40px',
            backgroundColor: '#fee2e2',
            color: '#7f1d1d',
            minHeight: '100vh',
            fontFamily: 'sans-serif',
          }}
        >
          <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>
            Application Error (Blank Screen Prevented)
          </h1>
          <p style={{ marginTop: '10px' }}>
            Tolong kirimkan foto/teks dari pesan eror di bawah ini ke asisten AI Anda:
          </p>
          <pre
            style={{
              marginTop: '20px',
              padding: '20px',
              backgroundColor: 'white',
              border: '1px solid #f87171',
              borderRadius: '8px',
              overflow: 'auto',
              fontSize: '12px',
            }}
          >
            {this.state.error && this.state.error.message}
            {'\n\n'}
            {this.state.error && this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </StrictMode>,
);
