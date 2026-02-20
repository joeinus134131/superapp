'use client';

import { useState } from 'react';
import { useUser } from '@/lib/auth';
import { pullFromCloud } from '@/lib/cloudSync';

export default function AuthGuard({ children }) {
  const { user, loading, login, loginByCode, getAllUsers, switchUser, AVATAR_OPTIONS } = useUser();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('😎');
  const [loginMode, setLoginMode] = useState('new'); // 'new' | 'existing' | 'code'
  const [uniqueCode, setUniqueCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);

  if (loading) {
    return (
      <div className="login-page">
        <div className="login-loading">
          <div className="login-loading-icon">⚡</div>
          <p>Loading SuperApp...</p>
        </div>
      </div>
    );
  }

  if (user) return children;

  const existingUsers = getAllUsers();

  const handleLogin = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    login(name.trim(), avatar);
  };

  const handleSwitchTo = (userId) => {
    switchUser(userId);
  };

  const handleCodeLogin = async () => {
    if (!uniqueCode.trim()) return;
    setCodeError('');
    setCodeLoading(true);

    // First try local user lookup
    const localResult = loginByCode(uniqueCode);
    if (localResult.success) {
      setCodeLoading(false);
      return;
    }

    // If not found locally, try pulling from cloud
    try {
      const syncId = uniqueCode.trim();
      await pullFromCloud(syncId);
      // After pull, try login again
      const retryResult = loginByCode(uniqueCode);
      if (retryResult.success) {
        setCodeLoading(false);
        return;
      }
      setCodeError('Data berhasil di-download tapi user tidak ditemukan. Coba refresh halaman.');
    } catch {
      setCodeError('Kode tidak ditemukan. Pastikan kode unik atau Sync ID benar.');
    }
    setCodeLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Hero */}
        <div className="login-hero">
          <div className="login-brand-icon">⚡</div>
          <h1 className="login-title">SuperApp</h1>
          <p className="login-subtitle">Personal Management Platform</p>
        </div>

        {loginMode === 'new' && (
          <>
            {/* Login Form */}
            <form className="login-form" onSubmit={handleLogin}>
              <div className="login-section">
                <label className="login-label">Siapa kamu?</label>
                <input
                  type="text"
                  className="login-input"
                  placeholder="Tulis namamu..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  maxLength={30}
                />
              </div>

              <div className="login-section">
                <label className="login-label">Pilih Avatar</label>
                <div className="avatar-grid">
                  {AVATAR_OPTIONS.map((av) => (
                    <button
                      key={av}
                      type="button"
                      className={`avatar-btn ${avatar === av ? 'selected' : ''}`}
                      onClick={() => setAvatar(av)}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" className="login-submit" disabled={!name.trim()}>
                <span>Masuk</span>
                <span>→</span>
              </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
              {existingUsers.length > 0 && (
                <button className="login-switch-btn" onClick={() => setLoginMode('existing')}>
                  👤 Masuk sebagai user lain ({existingUsers.length} tersimpan)
                </button>
              )}
              <button className="login-switch-btn" onClick={() => setLoginMode('code')}>
                🔑 Masuk dengan Kode Unik
              </button>
            </div>
          </>
        )}

        {loginMode === 'existing' && (
          <>
            {/* Existing Users */}
            <div className="login-section">
              <label className="login-label">Pilih Profil</label>
              <div className="existing-users">
                {existingUsers.map((u) => (
                  <button
                    key={u.id}
                    className="existing-user-card"
                    onClick={() => handleSwitchTo(u.id)}
                  >
                    <span className="existing-user-avatar">{u.avatar}</span>
                    <div className="existing-user-info">
                      <span className="existing-user-name">{u.name}</span>
                      <span className="existing-user-date">
                        Login terakhir: {new Date(u.lastLogin).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                    <span className="existing-user-arrow">→</span>
                  </button>
                ))}
              </div>
            </div>

            <button className="login-switch-btn" onClick={() => setLoginMode('new')}>
              ← Buat profil baru
            </button>
          </>
        )}

        {loginMode === 'code' && (
          <>
            {/* Code Login */}
            <div className="login-section" style={{ padding: '0 24px' }}>
              <label className="login-label">🔑 Masuk dengan Kode Unik</label>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Masukkan kode unik (SA-XXXXXXXX) atau Sync ID dari device lain untuk sinkronisasi data kamu.
              </p>
              <input
                type="text"
                className="login-input"
                placeholder="SA-XXXXXXXX atau Sync ID..."
                value={uniqueCode}
                onChange={(e) => { setUniqueCode(e.target.value.toUpperCase()); setCodeError(''); }}
                autoFocus
                style={{ textTransform: 'uppercase', fontFamily: 'monospace', letterSpacing: '2px', textAlign: 'center' }}
              />
              {codeError && (
                <p style={{ fontSize: '13px', color: 'var(--accent-red, #ef4444)', marginTop: '8px' }}>{codeError}</p>
              )}
              <button
                className="login-submit"
                onClick={handleCodeLogin}
                disabled={!uniqueCode.trim() || codeLoading}
                style={{ marginTop: '16px' }}
              >
                <span>{codeLoading ? '⏳ Mencari...' : '🔓 Masuk'}</span>
                <span>→</span>
              </button>
            </div>

            <button className="login-switch-btn" onClick={() => setLoginMode('new')}>
              ← Buat profil baru
            </button>
          </>
        )}

        <div className="login-footer">
          <p>Data tersimpan di browser kamu 🔒</p>
        </div>
      </div>
    </div>
  );
}
