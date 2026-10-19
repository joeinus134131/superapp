'use client';

import React from 'react';
import { translateText } from '@superapp/shared/translations';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  translate = (text) => translateText(text, typeof document === 'undefined' ? 'en' : document.documentElement.lang);

  handleReset = () => {
    // Clear localStorage cautiously, or just reload
    // In a real scenario you might want more granular recovery
    if (confirm(this.translate("Aplikasi mengalami error kritis. Apakah Anda ingin mereset state lokal (Storage) dan memuat ulang? PERINGATAN: Beberapa data yang belum di-sync mungkin hilang."))) {
      window.localStorage.clear();
      window.location.href = '/';
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          height: '100vh', padding: '24px', textAlign: 'center', background: 'var(--bg-primary)', color: 'var(--text-primary)'
        }}>
          <h2 style={{ fontSize: '24px', marginBottom: '16px', color: 'var(--accent-red)' }}>{this.translate("Ups! Terjadi Kesalahan Kritis 🚨")}</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', maxWidth: '400px' }}>
            {this.translate("Aplikasi mengalami kendala saat memuat data atau UI. Ini bisa terjadi karena batas memori browser penuh (QuotaExceededError).")}
          </p>
          <div style={{ display: 'flex', gap: '16px' }}>
             <button onClick={() => window.location.reload()} style={{
                padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', cursor: 'pointer'
             }}>{this.translate("Muat Ulang Layar")}</button>
             <button onClick={this.handleReset} style={{
                padding: '10px 20px', borderRadius: '8px', border: 'none', background: 'rgba(239, 68, 68, 0.2)', color: 'var(--accent-red)', cursor: 'pointer', fontWeight: 'bold'
             }}>{this.translate("Reset & Pulihkan")}</button>
          </div>
          {this.state.error && (
            <pre style={{ marginTop: '24px', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', fontSize: '12px', textAlign: 'left', overflowX: 'auto', maxWidth: '100%', color: 'var(--text-muted)' }}>
              {this.state.error.toString()}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
