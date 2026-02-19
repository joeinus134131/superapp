'use client';

import { useState } from 'react';
import { useUser } from '@/lib/auth';

export default function AuthGuard({ children }) {
  const { user, loading, login, getAllUsers, switchUser, AVATAR_OPTIONS } = useUser();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('😎');
  const [showExisting, setShowExisting] = useState(false);

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

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Hero */}
        <div className="login-hero">
          <div className="login-brand-icon">⚡</div>
          <h1 className="login-title">SuperApp</h1>
          <p className="login-subtitle">Personal Management Platform</p>
        </div>

        {!showExisting ? (
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

            {existingUsers.length > 0 && (
              <button className="login-switch-btn" onClick={() => setShowExisting(true)}>
                Atau masuk sebagai user lain ({existingUsers.length} tersimpan)
              </button>
            )}
          </>
        ) : (
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

            <button className="login-switch-btn" onClick={() => setShowExisting(false)}>
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
