'use client';

import { useState, useRef } from 'react';
import { useUser, AVATAR_OPTIONS } from '@/lib/auth';

export default function SettingsPage() {
  const { user, updateProfile } = useUser();
  const [name, setName] = useState(user?.name || '');
  const [avatar, setAvatar] = useState(user?.avatar || '😎');
  const [customPhoto, setCustomPhoto] = useState(user?.customPhoto || null);
  const [usePhoto, setUsePhoto] = useState(!!user?.customPhoto);
  const [appName, setAppName] = useState(user?.appName || '');
  const [appTagline, setAppTagline] = useState(user?.appTagline || '');
  const [appIcon, setAppIcon] = useState(user?.appIcon || '⚡');
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef(null);

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 150 * 1024) {
      alert('Ukuran foto max 150 KB. Coba foto yang lebih kecil.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCustomPhoto(ev.target.result);
      setUsePhoto(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSave = () => {
    if (!name.trim()) return;
    updateProfile({
      name: name.trim(),
      avatar: usePhoto ? avatar : avatar,
      customPhoto: usePhoto ? customPhoto : null,
      appName: appName.trim(),
      appTagline: appTagline.trim(),
      appIcon: appIcon,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleRemovePhoto = () => {
    setCustomPhoto(null);
    setUsePhoto(false);
  };

  if (!user) return null;

  return (
    <div>
      <div className="page-header">
        <h1>⚙️ Pengaturan Profil</h1>
        <p>Personalisasi profilmu — nama, avatar, dan foto</p>
      </div>

      {saved && <div className="xp-toast">✅ Profil disimpan!</div>}

      <div style={{ maxWidth: '600px' }}>
        {/* Profile Preview */}
        <div className="card card-padding mb-2" style={{ textAlign: 'center' }}>
          <div style={{
            width: '100px', height: '100px', borderRadius: '50%',
            background: 'var(--gradient-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: usePhoto && customPhoto ? '0' : '48px',
            margin: '0 auto 16px',
            overflow: 'hidden',
            border: '3px solid var(--border-accent)',
          }}>
            {usePhoto && customPhoto ? (
              <img src={customPhoto} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              avatar
            )}
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>{name || user.name}</h2>
          <p className="text-secondary text-sm">
            Member sejak {new Date(user.createdAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Unique ID Card */}
        <div className="card card-padding mb-2" style={{ background: 'var(--gradient-card)', border: '1px solid var(--accent-purple)' }}>
          <div className="flex justify-between items-center mb-1">
            <label className="form-label" style={{ marginBottom: 0 }}>🔑 Kode Unik Login</label>
            <span className="text-xs text-secondary" style={{ background: 'var(--bg-card)', padding: '2px 8px', borderRadius: '12px' }}>
              Simpan & Rahasiakan
            </span>
          </div>
          <p className="text-sm text-secondary mb-2">
            Gunakan kode ini untuk login dari device lain. Kode ini otomatis terhubung dengan data Cloud Sync kamu.
          </p>
          <div className="flex gap-1">
            <div style={{
              flex: 1,
              background: 'var(--bg-glass)',
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'monospace',
              fontSize: '18px',
              letterSpacing: '2px',
              textAlign: 'center',
              fontWeight: 700,
              color: 'var(--accent-purple)',
              border: '1px dashed var(--accent-purple)'
            }}>
              {user.uniqueCode || 'SA-XXXXXXXX'}
            </div>
            <button
              className="btn btn-primary"
              onClick={() => {
                navigator.clipboard.writeText(user.uniqueCode);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              style={{ width: '100px' }}
            >
              {copied ? '✅ Copied' : '📋 Copy'}
            </button>
          </div>
        </div>

        {/* Name */}
        <div className="card card-padding mb-2">
          <div className="form-group">
            <label className="form-label">📝 Nama</label>
            <input
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama kamu..."
              maxLength={30}
            />
          </div>
        </div>

        {/* Branding */}
        <div className="card card-padding mb-2">
          <label className="form-label">🏷️ Custom Branding (Sidebar)</label>
          <div className="grid-2" style={{ gap: '12px', marginBottom: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label text-xs">Nama Aplikasi</label>
              <input
                className="form-input"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="SuperApp"
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label text-xs">Tagline Aplikasi</label>
              <input
                className="form-input"
                value={appTagline}
                onChange={(e) => setAppTagline(e.target.value)}
                placeholder="Personal Management"
              />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label text-xs">Icon Aplikasi</label>
            <div className="flex flex-wrap gap-1">
              {['⚡', '🚀', '🔥', '💎', '🌟', '🎯', '🎨', '🎮', '💡', '🍀', '🌈', '🪐'].map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  className={`btn btn-icon ${appIcon === emoji ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setAppIcon(emoji)}
                  style={{ fontSize: '18px' }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Photo Upload */}
        <div className="card card-padding mb-2">
          <label className="form-label">📸 Foto Profil</label>
          <p className="text-sm text-secondary mb-2">Upload foto kamu (max 150 KB, disimpan di browser)</p>
          <div className="flex gap-1 items-center">
            <button className="btn btn-secondary" onClick={() => fileRef.current?.click()}>
              📤 Upload Foto
            </button>
            {customPhoto && (
              <>
                <button
                  className={`btn ${usePhoto ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setUsePhoto(true)}
                >
                  Pakai Foto
                </button>
                <button
                  className={`btn ${!usePhoto ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setUsePhoto(false)}
                >
                  Pakai Emoji
                </button>
                <button className="btn btn-danger btn-sm" onClick={handleRemovePhoto}>🗑</button>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
          {customPhoto && (
            <div style={{ marginTop: '12px' }}>
              <img
                src={customPhoto}
                alt="Preview"
                style={{
                  width: '64px', height: '64px', borderRadius: '50%',
                  objectFit: 'cover', border: '2px solid var(--border-accent)',
                }}
              />
            </div>
          )}
        </div>

        {/* Emoji Avatar Picker */}
        <div className="card card-padding mb-2">
          <label className="form-label">😎 Emoji Avatar {usePhoto && <span className="text-sm text-secondary">(fallback saat foto tidak aktif)</span>}</label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(8, 1fr)',
            gap: '8px',
            marginTop: '8px',
          }}>
            {AVATAR_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => { setAvatar(emoji); if (!customPhoto) setUsePhoto(false); }}
                style={{
                  fontSize: '28px',
                  padding: '8px',
                  borderRadius: 'var(--radius-lg)',
                  border: avatar === emoji ? '2px solid var(--accent-purple)' : '2px solid transparent',
                  background: avatar === emoji ? 'rgba(139, 92, 246, 0.15)' : 'var(--bg-glass)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  textAlign: 'center',
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <button className="btn btn-primary btn-lg w-full" onClick={handleSave}>
          💾 Simpan Profil
        </button>
      </div>
    </div>
  );
}
