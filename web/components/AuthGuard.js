'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useUser } from '@/lib/auth';
import { pullFromCloud } from '@/lib/cloudSync';
import { useLanguage } from '@/lib/language';
import { Globe } from 'lucide-react';

export default function AuthGuard({ children }) {
  const { user, login, loginByCode, getAllUsers, switchUser, AVATAR_OPTIONS, loading } = useUser();
  const { language, changeLanguage, t } = useLanguage();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('😎');
  const [loginMode, setLoginMode] = useState('new'); // 'new' | 'existing' | 'code'
  const [uniqueCode, setUniqueCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);

  // Sync language from user profile if available
  useEffect(() => {
    if (user && user.language && user.language !== language) {
      changeLanguage(user.language);
    }
  }, [user, language, changeLanguage]);

  if (loading) {
    return (
      <div className="login-page">
        <div className="login-loading">
          <div className="login-loading-icon">⚡</div>
          <p>{t('login.loading_app')}</p>
        </div>
      </div>
    );
  }

  if (user) return children;

  const existingUsers = getAllUsers();

  const handleLogin = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const loggedUser = login(name.trim(), avatar);
    // If it's a new user without a language setting, save the current language choice
    if (loggedUser && !loggedUser.language) {
      // Note: we can't easily wait here because login is synchronous and updateProfile needs user in context,
      // but we can let the next state update handle it or we update it in lib/auth.js.
      // Actually, if we want to save it, let's just do it directly.
    }
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
      setCodeError(t('login.code_download_success_error'));
    } catch {
      setCodeError(t('login.code_not_found_error'));
    }
    setCodeLoading(false);
  };

  return (
    <div className="login-page">
      {/* Language Toggle Header */}
      <div style={{ position: 'absolute', top: '24px', right: '24px', display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-card)', padding: '8px 16px', borderRadius: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <Globe size={16} color="var(--text-secondary)" />
        <select 
          value={language}
          onChange={(e) => changeLanguage(e.target.value)}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', cursor: 'pointer', appearance: 'none', fontWeight: 500 }}
        >
          <option value="id">🇮🇩 Indonesia</option>
          <option value="en">🇬🇧 English</option>
        </select>
      </div>

      <div className="login-container">
        {/* Hero */}
        <div className="login-hero">
          <div className="login-brand-icon">⚡</div>
          <h1 className="login-title">{t('login.title')}</h1>
          <p className="login-subtitle">{t('login.subtitle')}</p>
        </div>

        <div className="login-tabs">
          <button 
            className={`login-tab ${loginMode === 'new' ? 'active' : ''}`}
            onClick={() => setLoginMode('new')}
          >
            {t('login.new_user_tab')}
          </button>
          <button 
            className={`login-tab ${loginMode === 'existing' ? 'active' : ''}`}
            onClick={() => setLoginMode('existing')}
          >
            {t('login.existing_user_tab')}
          </button>
          <button 
            className={`login-tab ${loginMode === 'code' ? 'active' : ''}`}
            onClick={() => setLoginMode('code')}
          >
            {t('login.sync_login_tab')}
          </button>
        </div>

        {loginMode === 'new' && (
          <>
            {existingUsers.length > 0 && (
              <div style={{
                marginBottom: '20px', padding: '16px', borderRadius: 'var(--radius-md)',
                background: 'rgba(139, 92, 246, 0.15)', border: '1px solid var(--accent-purple)',
                display: 'flex', flexDirection: 'column', gap: '8px'
              }}>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>{t('login.existing_found_title')}</h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{t('login.existing_found_desc')}</p>
                </div>
                <button 
                  className="btn btn-primary btn-sm" 
                  onClick={() => setLoginMode('existing')}
                  style={{ alignSelf: 'flex-start', marginTop: '4px' }}
                >
                  {t('login.switch_to_existing')} →
                </button>
              </div>
            )}
            {/* Login Form */}
            <form className="login-form" onSubmit={handleLogin}>
              <div className="login-section">
                <label className="login-label">{t('login.new_user_label')}</label>
                <input
                  type="text"
                  className="login-input"
                  placeholder={t('login.new_user_placeholder')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  maxLength={30}
                />
              </div>

              <div className="login-section">
                <label className="login-label">{t('login.avatar_label')}</label>
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
                <span>{t('login.submit_new_user')}</span>
                <span>→</span>
              </button>
            </form>

          </>
        )}

        {loginMode === 'existing' && (
          <>
            {/* Existing Users */}
            <div className="login-section">
              <label className="login-label">{t('login.select_profile_label')}</label>
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
                        {t('login.last_login')}: {new Date(u.lastLogin).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US')}
                      </span>
                    </div>
                    <span className="existing-user-arrow">→</span>
                  </button>
                ))}
              </div>
            </div>

            <button className="login-switch-btn" onClick={() => setLoginMode('new')}>
              ← {t('login.create_new_profile_button')}
            </button>
          </>
        )}

        {loginMode === 'code' && (
          <>
            {/* Code Login */}
            <div className="login-section" style={{ padding: '0 24px' }}>
              <label className="login-label">🔑 {t('login.code_login_title')}</label>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                {t('login.code_login_subtitle')}
              </p>
              <input
                type="text"
                className="login-input"
                placeholder={t('login.code_placeholder')}
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
                <span>{codeLoading ? t('login.searching_data') : t('login.submit_code')}</span>
                <span>→</span>
              </button>
            </div>

            <button className="login-switch-btn" onClick={() => setLoginMode('new')}>
              ← {t('login.create_new_profile_button')}
            </button>
          </>
        )}

        <div className="login-footer" style={{ textAlign: 'center' }}>
          <p>{t('login.footer_secure')}</p>
          <div style={{ marginTop: '12px', fontSize: '12px', display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <Link href="/privacy" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>{t('login.privacy')}</Link>
            <Link href="/terms" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>{t('login.terms')}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
