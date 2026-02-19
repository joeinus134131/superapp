'use client';

import { useState, useRef } from 'react';
import { useUser, AVATAR_OPTIONS } from '@/lib/auth';

export default function SettingsPage() {
  const { user, updateProfile } = useUser();
  const [name, setName] = useState(user?.name || '');
  const [avatar, setAvatar] = useState(user?.avatar || '😎');
  const [customPhoto, setCustomPhoto] = useState(user?.customPhoto || null);
  const [usePhoto, setUsePhoto] = useState(!!user?.customPhoto);
  const [saved, setSaved] = useState(false);
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
