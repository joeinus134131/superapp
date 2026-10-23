'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  ArrowRight,
  Globe,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Smartphone,
  ShieldCheck,
  UserPlus,
  LogIn,
  CheckSquare,
  Flame,
  Target,
  Wallet,
  NotebookPen,
  BarChart3,
  Leaf,
} from 'lucide-react';
import { useUser } from '@superapp/shared/auth';
import { useLanguage } from '@superapp/shared/language';
import { BrandLogo } from './BrandLogo';

const STARTER_AVATARS = ['😎', '🦊', '🐱', '🐶', '🐼', '🌿', '🌙', '☀️'];

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
  </svg>
);

export default function AuthGuard({ children }) {
  const { tx: translateCopy } = useLanguage();
  const {
    user,
    loginWithEmail,
    loginWithOAuth,
    registerWithEmail,
    login,
    loginByCode,
    getAllUsers,
    switchUser,
    loading,
  } = useUser();

  const { language, changeLanguage, t } = useLanguage();

  // Mode: 'login' (default) | 'register' | 'guest' | 'local'
  const [mode, setMode] = useState('login');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('🌿');
  const [uniqueCode, setUniqueCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status states
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [existingUsers, setExistingUsers] = useState([]);

  useEffect(() => {
    let active = true;
    getAllUsers().then(users => {
      if (active) setExistingUsers(Array.isArray(users) ? users : []);
    });
    return () => {
      active = false;
    };
  }, [getAllUsers, user]);

  useEffect(() => {
    if (user?.language && user.language !== language) {
      changeLanguage(user.language);
    }
  }, [user, language, changeLanguage]);

  if (loading) {
    return (
      <main className="login-page" aria-busy="true">
        <div className="login-loading">
          <BrandLogo size={52} showText={false} className="login-loading-mark" />
          <p>{t('login.loading_app') || translateCopy("Menyiapkan ruang Whenya...")}</p>
        </div>
      </main>
    );
  }

  if (user) {
    return children;
  }

  // Handle Google OAuth
  const handleOAuth = async provider => {
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await loginWithOAuth(provider);
    } catch (err) {
      setErrorMsg(err?.message || translateCopy("Gagal menghubungkan autentikasi {0}.", [provider]));
      setSubmitting(false);
    }
  };

  // Handle Login via Supabase Email & Password
  const handleEmailLogin = async e => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg(translateCopy("Harap isi alamat email dan kata sandi."));
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await loginWithEmail(email.trim(), password);
      if (res?.success) {
        // Logged in successfully
      }
    } catch (err) {
      setErrorMsg(err?.message || translateCopy("Gagal masuk. Periksa kembali email dan kata sandi Anda."));
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Register via Supabase Email & Password
  const handleEmailRegister = async e => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg(translateCopy("Harap isi alamat email dan kata sandi."));
      return;
    }

    if (password.length < 6) {
      setErrorMsg(translateCopy("Kata sandi minimal 6 karakter."));
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await registerWithEmail(email.trim(), password, name.trim());
      if (res?.requiresVerification) {
        setSuccessMsg(res.message || translateCopy("Pendaftaran berhasil! Silakan periksa email Anda."));
        setMode('login');
      }
    } catch (err) {
      setErrorMsg(err?.message || translateCopy("Pendaftaran gagal. Coba gunakan email lain atau masuk."));
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Guest / Local Profile creation
  const handleGuestCreate = async e => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setErrorMsg('');

    try {
      await login(name.trim(), avatar);
    } catch {
      setErrorMsg(translateCopy("Profil lokal belum berhasil dibuat. Coba sekali lagi."));
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Login by Recovery Code
  const handleCodeLogin = async e => {
    e.preventDefault();
    if (!uniqueCode.trim()) return;
    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await loginByCode(uniqueCode);
      if (!res.success) {
        setErrorMsg(res.error || translateCopy("Kode tidak ditemukan."));
      }
    } catch {
      setErrorMsg(translateCopy("Kode tidak ditemukan atau format tidak sesuai."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-page auth-refresh">
      <div className="auth-topbar">
        <span className="auth-topbar-note">{translateCopy("Belum punya akun?")}</span>
        <button type="button" className="auth-topbar-action" disabled={submitting} onClick={() => { setMode(mode === 'register' ? 'login' : 'register'); setErrorMsg(''); setSuccessMsg(''); }}>
          {mode === 'register' ? translateCopy("Masuk ke Whenya") : translateCopy("Daftar sekarang")}
        </button>
      {/* Language Switcher */}
      <div className="login-language">
        <Globe size={16} aria-hidden="true" />
        <label className="sr-only" htmlFor="login-language">
          {translateCopy("Bahasa")}
        </label>
        <select
          id="login-language"
          value={language}
          onChange={event => changeLanguage(event.target.value)}
        >
          <option value="id">Indonesia</option>
          <option value="en">English</option>
        </select>
      </div>
      </div>

      <div className="auth-stage">
        <aside className="auth-story" aria-labelledby="auth-story-title">
          <BrandLogo size={100} variant="vertical" />
          <p className="auth-eyebrow"><Leaf size={13} aria-hidden="true" />{translateCopy("Ruang kecil untuk dirimu")}</p>
          <h2 id="auth-story-title">{translateCopy("Teman untuk hidup yang lebih terarah.")}</h2>
          <p className="auth-story-description">{translateCopy("Rencanakan hal penting, bangun kebiasaan baik, dan temukan ritmemu. Satu langkah kecil setiap hari.")}</p>
          <div className="auth-features">
            {[
              { Icon: CheckSquare, label: 'Tugas' }, { Icon: Flame, label: 'Kebiasaan' },
              { Icon: Target, label: 'Tujuan' }, { Icon: Wallet, label: 'Keuangan' },
              { Icon: NotebookPen, label: 'Jurnal' }, { Icon: BarChart3, label: 'Insight' },
            ].map(({ Icon, label }) => <div className="auth-feature" key={label}><span><Icon size={21} strokeWidth={1.7} aria-hidden="true" /></span><small>{translateCopy(label)}</small></div>)}
          </div>
          <div className="auth-story-quote"><span aria-hidden="true">“</span><p>{translateCopy("Versi terbaik dirimu berawal dari langkah kecil hari ini.")}</p><i aria-hidden="true" /></div>
        </aside>
      <section className="login-container" aria-labelledby="login-title">
        {/* Brand Header */}
        <header className="login-hero">
          <div className="auth-card-brand"><BrandLogo size={38} variant="horizontal" /></div>
          <h1 id="login-title" className="login-title">
            {mode === 'register'
              ? translateCopy("Mulai ruang hidupmu.")
              : mode === 'guest'
              ? translateCopy("Profil Lokal / Offline")
              : mode === 'local'
              ? translateCopy("Lanjutkan Profil di Perangkat")
              : translateCopy("Selamat datang kembali.")}
          </h1>
          <p className="login-subtitle">
            {mode === 'register'
              ? translateCopy("Daftar untuk sinkronisasi otomatis tugas, kebiasaan, dan jurnal antar web dan mobile.")
              : mode === 'guest'
              ? translateCopy("Gunakan Whenya secara lokal tanpa sinkronisasi cloud.")
              : translateCopy("Masuk untuk melanjutkan perjalanan menuju hari yang lebih tenang.")}
          </p>
        </header>

        {/* Navigation Tabs */}
        {mode !== 'login' && <div className="login-tabs" role="tablist" aria-label={translateCopy("Mode masuk")}>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            className={`login-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => {
              setMode('login');
              setErrorMsg('');
              setSuccessMsg('');
            }}
          >
            {translateCopy("Masuk")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'register'}
            className={`login-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => {
              setMode('register');
              setErrorMsg('');
              setSuccessMsg('');
            }}
          >
            {translateCopy("Daftar sekarang")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'guest' || mode === 'local'}
            className={`login-tab ${mode === 'guest' || mode === 'local' ? 'active' : ''}`}
            onClick={() => {
              setMode(existingUsers.length > 0 ? 'local' : 'guest');
              setErrorMsg('');
              setSuccessMsg('');
            }}
          >
            {translateCopy("Lokal / Tamu")}
          </button>
        </div>}

        {/* Success Alert */}
        {successMsg ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 16px',
              backgroundColor: '#EFF7ED',
              borderRadius: 14,
              border: '1px solid #C4E2CF',
              color: '#193F30',
              fontSize: 13.5,
              fontWeight: 600,
              marginBottom: 16,
              textAlign: 'left',
            }}
          >
            <CheckCircle2 size={18} color="#193F30" style={{ flexShrink: 0 }} />
            <span>{translateCopy(successMsg)}</span>
          </div>
        ) : null}

        {/* Error Alert */}
        {errorMsg ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 16px',
              backgroundColor: '#FEF2F2',
              borderRadius: 14,
              border: '1px solid #FCA5A5',
              color: '#991B1B',
              fontSize: 13.5,
              fontWeight: 600,
              marginBottom: 16,
              textAlign: 'left',
            }}
          >
            <AlertCircle size={18} color="#DC2626" style={{ flexShrink: 0 }} />
            <span>{translateCopy(errorMsg)}</span>
          </div>
        ) : null}

        {/* MODE 1: LOGIN (EMAIL & PASSWORD) */}
        {mode === 'login' && (
          <form className="login-form" onSubmit={handleEmailLogin}>
            <div className="login-section">
              <label className="login-label" htmlFor="login-email">
                {translateCopy("Alamat Email")}
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Mail
                  size={18}
                  style={{
                    position: 'absolute',
                    left: 14,
                    color: 'var(--text-muted)',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  id="login-email"
                  type="email"
                  className="login-input"
                  style={{ paddingLeft: 42 }}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="login-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <label className="login-label" htmlFor="login-password" style={{ marginBottom: 0 }}>
                  {translateCopy("Kata Sandi")}
                </label>
              </div>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Lock
                  size={18}
                  style={{
                    position: 'absolute',
                    left: 14,
                    color: 'var(--text-muted)',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="login-input"
                  style={{ paddingLeft: 42, paddingRight: 44 }}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 4,
                  }}
                  aria-label={showPassword ? translateCopy("Sembunyikan kata sandi") : translateCopy("Tampilkan kata sandi")}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="login-submit"
              disabled={submitting || !email.trim() || !password}
              style={{
                backgroundColor: '#193F30',
                color: '#FFFFFF',
                fontWeight: 700,
                marginTop: 8,
              }}
            >
              {submitting ? translateCopy("Memverifikasi…") : translateCopy("Masuk ke Whenya")}
              {!submitting && <ArrowRight size={18} />}
            </button>

            <div className="auth-divider"><span /> <small>{translateCopy("atau masuk dengan")}</small> <span /></div>

            {/* OAuth Buttons */}
            <div className="auth-oauth-stack">
              <button
                type="button"
                onClick={() => handleOAuth('google')}
                disabled={submitting}
                className="oauth-web-btn"
              >
                <GoogleIcon />
                <span>{translateCopy("Masuk dengan Google")}</span>
              </button>
            </div>

            <div className="auth-login-options"
              style={{
                marginTop: 20,
                paddingTop: 16,
                borderTop: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 13,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMsg('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#193F30',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {translateCopy("Belum punya akun? Daftar")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('guest');
                  setErrorMsg('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {translateCopy("Masuk mode tamu")}
              </button>
            </div>
          </form>
        )}

        {/* MODE 2: REGISTER (EMAIL & PASSWORD & NAME) */}
        {mode === 'register' && (
          <form className="login-form auth-register-form" onSubmit={handleEmailRegister}>
            <div className="login-section">
              <label className="login-label" htmlFor="register-name">
                {translateCopy("Nama Panggilan")}
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <User
                  size={18}
                  style={{
                    position: 'absolute',
                    left: 14,
                    color: 'var(--text-muted)',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  id="register-name"
                  type="text"
                  className="login-input"
                  style={{ paddingLeft: 42 }}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={translateCopy("Contoh: Raka")}
                  autoComplete="name"
                  autoFocus
                />
              </div>
            </div>

            <div className="login-section">
              <label className="login-label" htmlFor="register-email">
                {translateCopy("Alamat Email")}
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Mail
                  size={18}
                  style={{
                    position: 'absolute',
                    left: 14,
                    color: 'var(--text-muted)',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  id="register-email"
                  type="email"
                  className="login-input"
                  style={{ paddingLeft: 42 }}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="login-section">
              <label className="login-label" htmlFor="register-password">
                {translateCopy("Kata Sandi (minimal 6 karakter)")}
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Lock
                  size={18}
                  style={{
                    position: 'absolute',
                    left: 14,
                    color: 'var(--text-muted)',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  className="login-input"
                  style={{ paddingLeft: 42, paddingRight: 44 }}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 4,
                  }}
                  aria-label={showPassword ? translateCopy("Sembunyikan kata sandi") : translateCopy("Tampilkan kata sandi")}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="login-submit"
              disabled={submitting || !email.trim() || !password}
              style={{
                backgroundColor: '#193F30',
                color: '#FFFFFF',
                fontWeight: 700,
                marginTop: 8,
              }}
            >
              {submitting ? translateCopy("Mendaftarkan…") : translateCopy("Daftar Akun Whenya")}
              {!submitting && <ArrowRight size={18} />}
            </button>

            <div className="auth-divider"><span /><small>{translateCopy("atau daftar dengan")}</small><span /></div>

            <div className="auth-oauth-stack">
              <button type="button" onClick={() => handleOAuth('google')} disabled={submitting} className="oauth-web-btn"><GoogleIcon /><span>{translateCopy("Daftar dengan Google")}</span></button>
            </div>


            <div
              style={{
                marginTop: 20,
                paddingTop: 16,
                borderTop: '1px solid var(--border-color)',
                textAlign: 'center',
                fontSize: 13,
              }}
            >
              <span style={{ color: 'var(--text-secondary)' }}>{translateCopy("Sudah punya akun?")} </span>
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#193F30',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {translateCopy("Masuk di sini")}
              </button>
            </div>
          </form>
        )}

        {/* MODE 3: LOCAL GUEST / OFFLINE PROFILE */}
        {mode === 'guest' && (
          <form className="login-form" onSubmit={handleGuestCreate}>
            <div className="login-form-heading">
              <Sparkles size={20} aria-hidden="true" color="#193F30" />
              <div>
                <h2>{translateCopy("Profil Lokal / Tamu")}</h2>
                <p>{translateCopy("Data tersimpan di browser ini tanpa perlu akun email.")}</p>
              </div>
            </div>

            <div className="login-section">
              <label className="login-label" htmlFor="guest-name">
                {translateCopy("Nama panggilan")}
              </label>
              <input
                id="guest-name"
                className="login-input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={translateCopy("Contoh: Raka")}
                maxLength={30}
                autoFocus
              />
            </div>

            <fieldset className="login-section avatar-fieldset">
              <legend className="login-label">
                {translateCopy("Pilih ikon")} <span>{translateCopy("(opsional)")}</span>
              </legend>
              <div className="avatar-grid compact">
                {STARTER_AVATARS.map(option => (
                  <button
                    key={option}
                    type="button"
                    className={`avatar-btn ${avatar === option ? 'selected' : ''}`}
                    aria-label={translateCopy("Pilih avatar {0}", [option])}
                    aria-pressed={avatar === option}
                    onClick={() => setAvatar(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </fieldset>

            <button
              type="submit"
              className="login-submit"
              disabled={!name.trim() || submitting}
              style={{ backgroundColor: '#193F30', color: '#FFFFFF', fontWeight: 700 }}
            >
              {submitting ? translateCopy("Menyiapkan…") : translateCopy("Lanjut ke Hari Ini")}
            </button>

            <div
              style={{
                marginTop: 20,
                paddingTop: 16,
                borderTop: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 13,
              }}
            >
              <button
                type="button"
                onClick={() => setMode('login')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#193F30',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {translateCopy("← Kembali ke Masuk Email")}
              </button>
              {existingUsers.length > 0 && (
                <button
                  type="button"
                  onClick={() => setMode('local')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  {translateCopy("Pilih Profil Tersimpan")}
                </button>
              )}
            </div>
          </form>
        )}

        {/* MODE 4: EXISTING LOCAL PROFILES */}
        {mode === 'local' && (
          <div className="login-form">
            <div className="login-form-heading">
              <LogIn size={20} aria-hidden="true" color="#193F30" />
              <div>
                <h2>{translateCopy("Profil di Perangkat Ini")}</h2>
                <p>{translateCopy("Pilih profil lokal yang ingin dilanjutkan.")}</p>
              </div>
            </div>

            {existingUsers.length ? (
              <div className="existing-users">
                {existingUsers.map(profile => (
                  <button
                    key={profile.id}
                    className="existing-user-card"
                    onClick={() => switchUser(profile.id)}
                  >
                    <span className="existing-user-avatar" aria-hidden="true">
                      {profile.avatar || '🙂'}
                    </span>
                    <span className="existing-user-info">
                      <strong>{profile.name}</strong>
                      <small>
                        {profile.email
                          ? translateCopy("Akun Cloud: {0}", [profile.email])
                          : translateCopy("Terakhir dibuka {0}", [new Date(profile.lastLogin).toLocaleDateString(
                              language === 'id' ? 'id-ID' : 'en-US'
                            )])}
                      </small>
                    </span>
                    <span aria-hidden="true">›</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="login-empty">
                <p>{translateCopy("Belum ada profil lokal tersimpan.")}</p>
              </div>
            )}

            <div
              style={{
                marginTop: 20,
                paddingTop: 16,
                borderTop: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 13,
              }}
            >
              <button
                type="button"
                onClick={() => setMode('login')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#193F30',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {translateCopy("← Masuk dengan Email")}
              </button>
              <button
                type="button"
                onClick={() => setMode('guest')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                {translateCopy("+ Buat Profil Tamu Baru")}
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="login-footer">
          <p>
            <Link href="/privacy">{translateCopy("Privasi")}</Link>
            <span aria-hidden="true"> · </span>
            <Link href="/terms">{translateCopy("Ketentuan")}</Link>
          </p>
        </footer>
      </section>
      </div>
    </main>
  );
}
