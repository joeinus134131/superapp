'use client';

import { useState, useRef } from 'react';
import { useUser, AVATAR_OPTIONS } from '@/lib/auth';
import {
  Settings, CheckCircle2, Key, Check, Copy, User, Tag,
  Camera, Upload, Trash2, Smile, Save, Globe
} from 'lucide-react';
import { useLanguage } from '@/lib/language';

export default function SettingsPage() {
  const { user, updateProfile } = useUser();
  const { language, changeLanguage, t } = useLanguage();
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
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Settings size={32} color="var(--accent-purple)" /> {t('settings.page_title')}</h1>
        <p>{t('settings.page_desc')}</p>
      </div>

      {saved && <div className="xp-toast" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CheckCircle2 size={16} color="var(--accent-green)" /> {t('settings.saved_toast')}</div>}

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
            {t('settings.member_since')} {new Date(user.createdAt).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Language Preferences */}
        <div className="card card-padding mb-2">
          <div className="flex justify-between items-center mb-1">
            <label className="form-label" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '6px' }}><Globe size={16} /> {t('settings.language')}</label>
          </div>
          <p className="text-sm text-secondary mb-3">
            {t('settings.language_desc')}
          </p>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <select
              className="form-input"
              value={language}
              onChange={(e) => {
                changeLanguage(e.target.value);
                updateProfile({ language: e.target.value });
              }}
              style={{ cursor: 'pointer', appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '12px auto' }}
            >
              <option value="id">🇮🇩 Indonesia (ID)</option>
              <option value="en">🇬🇧 English (EN)</option>
            </select>
          </div>
        </div>

        {/* Unique ID Card */}
        <div className="card card-padding mb-2" style={{ background: 'var(--gradient-card)', border: '1px solid var(--accent-purple)' }}>
          <div className="flex justify-between items-center mb-1">
            <label className="form-label" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '6px' }}><Key size={16} /> {t('settings.unique_id')}</label>
            <span className="text-xs text-secondary" style={{ background: 'var(--bg-card)', padding: '2px 8px', borderRadius: '12px' }}>
              {t('settings.unique_id_badge')}
            </span>
          </div>
          <p className="text-sm text-secondary mb-2">
            {t('settings.unique_id_desc')}
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
              style={{ width: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              {copied ? <><Check size={16} /> {t('settings.copied')}</> : <><Copy size={16} /> {t('settings.copy')}</>}
            </button>
          </div>
        </div>

        {/* Name */}
        <div className="card card-padding mb-2">
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><User size={16} /> {t('settings.name')}</label>
            <input
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('settings.name_placeholder')}
              maxLength={30}
            />
          </div>
        </div>

        {/* Branding */}
        <div className="card card-padding mb-2">
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Tag size={16} /> {t('settings.branding')}</label>
          <div className="grid-2" style={{ gap: '12px', marginBottom: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label text-xs">{t('settings.app_name')}</label>
              <input
                className="form-input"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="SuperApp"
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label text-xs">{t('settings.app_tagline')}</label>
              <input
                className="form-input"
                value={appTagline}
                onChange={(e) => setAppTagline(e.target.value)}
                placeholder="Personal Management"
              />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label text-xs">{t('settings.app_icon')}</label>
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
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Camera size={16} /> {t('settings.photo')}</label>
          <p className="text-sm text-secondary mb-2">{t('settings.photo_desc')}</p>
          <div className="flex gap-1 items-center">
            <button className="btn btn-secondary" onClick={() => fileRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Upload size={16} /> {t('settings.upload_photo')}
            </button>
            {customPhoto && (
              <>
                <button
                  className={`btn ${usePhoto ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setUsePhoto(true)}
                >
                  {t('settings.use_photo')}
                </button>
                <button
                  className={`btn ${!usePhoto ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setUsePhoto(false)}
                >
                  {t('settings.use_emoji')}
                </button>
                <button className="btn btn-danger btn-sm" onClick={handleRemovePhoto} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={16} /></button>
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
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Smile size={16} /> {t('settings.emoji_avatar')} {usePhoto && <span className="text-sm text-secondary">{t('settings.emoji_fallback')}</span>}</label>
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
        <button className="btn btn-primary btn-lg w-full" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <Save size={18} /> {t('settings.save_profile')}
        </button>
      </div>
    </div>
  );
}
