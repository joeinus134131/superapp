'use client';

import { persistRestoredEntries } from '@/lib/storage';
import { syncDatabase, scheduleDatabaseSync } from '@/lib/databaseSync';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Search, Bell, X, ChevronRight, ChevronDown, User, Settings,
  DownloadCloud, UploadCloud, Cloud, LogOut, Database, Copy,
  HelpCircle, MessageSquare, Gem, Check, Sparkles
} from 'lucide-react';
import { useUser } from '@superapp/shared/auth';
import { usePremium } from '@superapp/shared/premium';
import { useLanguage } from '@superapp/shared/language';
import { exportAllData, importData, getStorageSize } from '@superapp/shared/backup';
import { pullFromCloud, getSyncId } from '@/lib/cloudSync';
import { getData, STORAGE_KEYS } from '@/lib/storage';
import { BrandLogo } from './BrandLogo';
import OnboardingModal from '@/components/OnboardingModal';
import FeedbackModal from '@/components/FeedbackModal';

export default function Topbar() {
  const { tx: translateCopy } = useLanguage();
  const router = useRouter();
  const { user, logout } = useUser();
  const { t } = useLanguage();
  const { balance, storageLimitMB, isPremium } = usePremium();

  // Search state
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [failed, setFailed] = useState(false);

  // User dropdown & modals state
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const fileRef = useRef(null);

  const [storageInfo, setStorageInfo] = useState(null);
  const [importMsg, setImportMsg] = useState(null);

  // Cloud sync state
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncMsg, setSyncMsg] = useState(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncConflicts, setSyncConflicts] = useState([]);
  const [pullId, setPullId] = useState('');
  const [currentSyncId, setCurrentSyncId] = useState(null);

  // Modals
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    setStorageInfo(getStorageSize());
    setCurrentSyncId(getSyncId());
  }, [user]);

  // Click outside listener for dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Escape key listener
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setShowDropdown(false);
        setQuery('');
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Search handler
  useEffect(() => {
    let active = true;
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      const groups = [
        { key: STORAGE_KEYS.TASKS, href: '/tasks', label: translateCopy("Tugas") },
        { key: STORAGE_KEYS.GOALS, href: '/goals', label: translateCopy("Tujuan") },
        { key: STORAGE_KEYS.HABITS, href: '/habits', label: translateCopy("Kebiasaan") },
        { key: STORAGE_KEYS.JOURNAL, href: '/journal', label: translateCopy("Jurnal") }
      ];
      Promise.all(groups.map(async group => ({ ...group, entries: await getData(group.key) })))
        .then(groups => {
          if (!active) return;
          setResults(
            groups.flatMap(group =>
              (Array.isArray(group.entries) ? group.entries : []).filter(item =>
                `${item.title || item.name || ''} ${item.description || ''} ${item.content || ''}`
                  .toLowerCase()
                  .includes(query.toLowerCase().trim())
              ).map(item => ({
                id: `${group.href}-${item.id}`,
                title: item.title || item.name || translateCopy("Catatan"),
                label: group.label,
                href: group.href
              }))
            ).slice(0, 8)
          );
          setFailed(false);
        })
        .catch(() => {
          if (active) setFailed(true);
        })
        .finally(() => {
          if (active) setSearching(false);
        });
    }, 180);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, translateCopy]);

  useEffect(() => {
    const onSyncError = event => { setSyncMsg(`❌ ${event.detail.message}`); setSyncConflicts(event.detail.conflicts || []); setShowSyncModal(true); };
    window.addEventListener('whenya:sync-error', onSyncError);
    window.addEventListener('online', scheduleDatabaseSync);
    return () => {
      window.removeEventListener('whenya:sync-error', onSyncError);
      window.removeEventListener('online', scheduleDatabaseSync);
    };
  }, []);

  const handleExport = () => {
    setShowDropdown(false);
    exportAllData();
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const result = await importData(file, persistRestoredEntries);
      try {
        const synced = await syncDatabase();
        setImportMsg(translateCopy("✅ {0} data dipulihkan; cloud terverifikasi ({1} unggahan).", [result.keys, synced.uploaded]));
      } catch (error) {
        setImportMsg(translateCopy("⚠️ {0} data dipulihkan lokal. Cloud belum tersinkron: {1}", [result.keys, error.message]));
        return;
      }
      setTimeout(() => {
        setImportMsg(null);
        window.location.reload();
      }, 1500);
    } catch (err) {
      setImportMsg(`❌ ${err.message}`);
      setTimeout(() => setImportMsg(null), 3000);
    }
    e.target.value = '';
  };

  const handlePush = async (resolutions = {}) => {
    setSyncLoading(true);
    setSyncMsg(null);
    try {
      const result = await syncDatabase({ resolutions });
      setSyncConflicts([]);
      setSyncMsg(translateCopy("✅ Cloud terverifikasi: {0} unggahan, {1} unduhan. Muat ulang untuk melihat data terbaru.", [result.uploaded, result.downloaded]));
    } catch (err) {
      setSyncMsg(`❌ ${err.message}`);
      setSyncConflicts(err.conflicts || []);
    }
    setSyncLoading(false);
  };

  const handlePull = async () => {
    if (!pullId.trim()) return;
    setSyncLoading(true);
    setSyncMsg(null);
    try {
      const result = await pullFromCloud(pullId.trim());
      setSyncMsg(translateCopy("✅ {0} data backup lama dipulihkan lokal. Gunakan Sync Sekarang untuk mengirim ke database akun.", [result.keysRestored]));
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setSyncMsg(`❌ ${err.message}`);
    }
    setSyncLoading(false);
  };

  const copySyncId = () => {
    if (currentSyncId) {
      navigator.clipboard.writeText(currentSyncId);
      setSyncMsg(translateCopy("📋 Sync ID berhasil disalin!"));
      setTimeout(() => setSyncMsg(null), 2000);
    }
  };

  const renderAvatar = (size = 32) => {
    if (user?.customPhoto) {
      return (
        <Image
          src={user.customPhoto}
          alt={user.name || 'Avatar'}
          width={size}
          height={size}
          unoptimized
          style={{ width: `${size}px`, height: `${size}px`, borderRadius: '50%', objectFit: 'cover' }}
        />
      );
    }
    if (user?.avatar && user.avatar.length <= 4) {
      return <span style={{ fontSize: `${Math.round(size * 0.55)}px` }}>{user.avatar}</span>;
    }
    return <span>{user?.name?.slice(0, 1).toUpperCase() || 'W'}</span>;
  };

  const storagePercentage = storageInfo
    ? Math.min(100, Math.round((storageInfo.used / (storageLimitMB * 1024 * 1024)) * 100))
    : 0;

  return (
    <>
      <header className="wy-topbar">
        <Link href="/" className="wy-mobile-brand" aria-label={translateCopy("Whenya beranda")}>
          <BrandLogo size={32} textSize="22px" />
        </Link>

        <div className="wy-topbar-breadcrumb">
          {translateCopy("Ruang personalmu")} <ChevronRight size={13} />
          <span>Your life, in sync.</span>
        </div>

        {/* Global Search */}
        <div className="wy-global-search">
          <Search size={16} />
          <input
            aria-label={translateCopy("Cari di Whenya")}
            type="search"
            placeholder={translateCopy("Cari tugas, tujuan, atau catatan…")}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Escape') setQuery('');
            }}
          />
          <kbd>⌕</kbd>

          {query.trim() && (
            <div className="wy-search-results" aria-live="polite">
              <div className="wy-search-title">
                <span>{translateCopy("Hasil pencarian")}</span>
                <button aria-label={translateCopy("Tutup pencarian")} onClick={() => setQuery('')}>
                  <X size={15} />
                </button>
              </div>
              {searching ? (
                <p>{translateCopy("Mencari…")}</p>
              ) : failed ? (
                <p>{translateCopy("Pencarian belum dapat dimuat.")}</p>
              ) : results.length ? (
                results.map(item => (
                  <Link key={item.id} href={item.href} onClick={() => setQuery('')}>
                    <span>{item.title}</span>
                    <small>{item.label}</small>
                  </Link>
                ))
              ) : (
                <p>{translateCopy("Tidak ada hasil untuk “")}{query}”.</p>
              )}
            </div>
          )}
        </div>

        {/* Notifications Icon */}
        <Link href="/notifications" className="wy-notification" aria-label={translateCopy("Buka notifikasi")}>
          <Bell size={19} />
          <i />
        </Link>

        {/* User Profile Dropdown Button */}
        {user ? (
          <div className="wy-topbar-profile-container" ref={dropdownRef}>
            <button
              type="button"
              className="wy-topbar-profile-btn"
              onClick={() => setShowDropdown(!showDropdown)}
              aria-expanded={showDropdown}
              aria-label={translateCopy("Buka menu profil pengguna")}
            >
              <div className="wy-topbar-profile-avatar">
                {renderAvatar(32)}
              </div>
              <div className="wy-topbar-profile-meta">
                <span className="wy-topbar-profile-name">{user?.name?.split(' ')[0] || translateCopy("Profil")}</span>
                <span className="wy-topbar-profile-badge">{isPremium ? 'PRO' : 'FREE'}</span>
              </div>
              <ChevronDown size={14} className={`wy-profile-chevron ${showDropdown ? 'rotate' : ''}`} />
            </button>

            {/* Dropdown Menu Popup */}
            {showDropdown && (
              <div className="wy-user-dropdown-menu" role="menu">
                {/* User Header */}
                <div className="wy-dropdown-header">
                  <div className="wy-dropdown-avatar">
                    {renderAvatar(42)}
                  </div>
                  <div className="wy-dropdown-user-details">
                    <span className="wy-dropdown-name">{user.name}</span>
                    <span className="wy-dropdown-email">{user.email || translateCopy("Data tersimpan di perangkat")}</span>
                  </div>
                </div>

                {/* Plan & Storage Summary Card */}
                <div className="wy-dropdown-card">
                  <div className="wy-dropdown-plan-row">
                    <span className="wy-dropdown-plan-badge">
                      {isPremium ? translateCopy("🌟 Premium User") : translateCopy("Standard User")}
                    </span>
                    <span className="wy-dropdown-tokens">{balance} {translateCopy("Token")}</span>
                  </div>

                  {storageInfo && (
                    <>
                      <div className="wy-dropdown-storage-bar">
                        <div
                          className="wy-dropdown-storage-fill"
                          style={{
                            width: `${storagePercentage}%`,
                            background: isPremium ? 'var(--accent-purple, #8b5cf6)' : '#193f30'
                          }}
                        />
                      </div>
                      <div className="wy-dropdown-storage-info">
                        <span><Database size={11} style={{ verticalAlign: 'middle', marginRight: '3px' }} /> {storageInfo.usedMB} / {storageLimitMB} MB</span>
                        <span>{storagePercentage}%</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Menu items */}
                <div className="wy-dropdown-items-list">
                  <Link
                    href="/settings"
                    className="wy-dropdown-item"
                    onClick={() => setShowDropdown(false)}
                  >
                    <Settings size={15} />
                    <span>{translateCopy("Pengaturan Akun")}</span>
                  </Link>

                  <Link
                    href="/premium"
                    className="wy-dropdown-item"
                    onClick={() => setShowDropdown(false)}
                  >
                    <Gem size={15} />
                    <span>{isPremium ? translateCopy("Kelola Langganan Pro") : translateCopy("Upgrade ke Pro")}</span>
                  </Link>

                  <button
                    type="button"
                    className="wy-dropdown-item"
                    onClick={() => {
                      setShowDropdown(false);
                      setShowSyncModal(true);
                    }}
                  >
                    <Cloud size={15} />
                    <span>{t('sidebar.menu_sync') || translateCopy("Cloud Sync & Perangkat")}</span>
                  </button>

                  <button
                    type="button"
                    className="wy-dropdown-item"
                    onClick={handleExport}
                  >
                    <DownloadCloud size={15} />
                    <span>{t('sidebar.menu_backup') || translateCopy("Cadangkan Data (JSON)")}</span>
                  </button>

                  <button
                    type="button"
                    className="wy-dropdown-item"
                    onClick={() => {
                      setShowDropdown(false);
                      fileRef.current?.click();
                    }}
                  >
                    <UploadCloud size={15} />
                    <span>{t('sidebar.menu_restore') || translateCopy("Pulihkan Data")}</span>
                  </button>

                  <button
                    type="button"
                    className="wy-dropdown-item"
                    onClick={() => {
                      setShowDropdown(false);
                      setShowOnboarding(true);
                    }}
                  >
                    <HelpCircle size={15} />
                    <span>{t('sidebar.menu_guide') || translateCopy("Panduan Pengguna")}</span>
                  </button>

                  <button
                    type="button"
                    className="wy-dropdown-item"
                    onClick={() => {
                      setShowDropdown(false);
                      setShowFeedback(true);
                    }}
                  >
                    <MessageSquare size={15} />
                    <span>{t('sidebar.menu_feedback') || translateCopy("Kirim Masukan")}</span>
                  </button>
                </div>

                <div className="wy-dropdown-divider" />

                {/* Logout Button */}
                <button
                  type="button"
                  className="wy-dropdown-item danger"
                  onClick={() => {
                    setShowDropdown(false);
                    logout();
                    router.push('/');
                  }}
                >
                  <LogOut size={15} />
                  <span>{t('sidebar.menu_logout') || translateCopy("Keluar / Ganti Akun")}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link href="/login" className="btn btn-primary btn-sm">
            {translateCopy("Masuk")}
          </Link>
        )}
      </header>

      {/* Hidden File Input for Restore */}
      <input
        ref={fileRef}
        type="file"
        accept=".json"
        onChange={handleImport}
        style={{ display: 'none' }}
      />

      {/* Import Toast Message */}
      {importMsg && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          background: '#193f30',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          fontSize: '13px',
          fontWeight: 600,
        }}>
          {translateCopy(importMsg)}
        </div>
      )}

      {/* Cloud Sync Modal */}
      {showSyncModal && (
        <div className="modal-overlay" onClick={() => setShowSyncModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Cloud size={20} /> {t('sync.title')}
              </h2>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowSyncModal(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <p className="text-sm text-secondary mb-2">
                {translateCopy("Hubungkan akun cloud yang sama di web dan mobile. Sync Sekarang menyinkronkan data dua arah. Data database dilindungi akses akun; jalur ini tidak memakai enkripsi backup dengan password.")}

              </p>

              {/* Push Section */}
              <div className="card card-padding mb-2" style={{ background: 'var(--bg-glass)' }}>
                <h4 style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <UploadCloud size={16} /> {translateCopy("Sinkronisasi akun cloud")}
                </h4>
                <button
                  className="btn btn-primary w-full"
                  onClick={() => handlePush()}
                  disabled={syncLoading}
                  style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                >
                  {syncLoading ? translateCopy("⏳ Mengunggah...") : <><Cloud size={16} /> {translateCopy("Sync Sekarang")}</>}
                </button>
                {currentSyncId && (
                  <div style={{ marginTop: '8px' }}>
                    <div className="text-xs text-secondary">{t('sync.secure_key')}</div>
                    <div className="flex items-center gap-1" style={{ marginTop: '4px' }}>
                      <code style={{
                        flex: 1, padding: '6px 10px', background: 'var(--bg-card)',
                        borderRadius: 'var(--radius-md)', fontSize: '12px', fontFamily: 'monospace',
                        wordBreak: 'break-all', color: 'var(--accent-purple)',
                      }}>
                        {currentSyncId}
                      </code>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={copySyncId}
                        title={translateCopy("Salin Sync ID")}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Pull Section */}
              <div className="card card-padding" style={{ background: 'var(--bg-glass)' }}>
                <h4 style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <DownloadCloud size={16} /> {translateCopy("Pulihkan backup Supabase lama")}
                </h4>
                <div className="flex gap-1" style={{ marginTop: '12px' }}>
                  <input
                    className="form-input"
                    value={pullId}
                    onChange={e => setPullId(e.target.value)}
                    placeholder={translateCopy("Sync ID backup lama...")}
                    style={{ flex: 1, fontSize: '13px' }}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={handlePull}
                    disabled={syncLoading || !pullId.trim()}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    {syncLoading ? '⏳' : <DownloadCloud size={16} />}
                  </button>
                </div>
              </div>

              {syncConflicts.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <p>{translateCopy("Pilih versi untuk modul yang konflik. Versi yang dipilih menggantikan seluruh modul; ekspor backup dahulu bila kedua versi diperlukan.")}</p>
                  <div style={{ maxHeight: 240, overflow: 'auto' }}>
                    {syncConflicts.map(item => <details key={item.key}><summary>{item.key}</summary>
                      <p>{translateCopy("Lokal")}</p><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(item.local, null, 2)}</pre>
                      <p>Cloud</p><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(item.cloud, null, 2)}</pre>
                    </details>)}
                  </div>
                  <div className="flex gap-1">
                    <button className="btn btn-secondary" disabled={syncLoading} onClick={() => handlePush(Object.fromEntries(syncConflicts.map(item => [item.key, { choice: 'local', localHash: item.localHash, revision: item.revision, checksum: item.checksum }])))}>{translateCopy("Gunakan versi lokal")}</button>
                    <button className="btn btn-secondary" disabled={syncLoading} onClick={() => handlePush(Object.fromEntries(syncConflicts.map(item => [item.key, { choice: 'cloud', localHash: item.localHash, revision: item.revision, checksum: item.checksum }])))}>{translateCopy("Gunakan versi cloud")}</button>
                  </div>
                </div>
              )}
              {syncMsg && (
                <div style={{
                  marginTop: '12px', padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: syncMsg.includes('✅')
                    ? 'rgba(16,185,129,0.1)'
                    : syncMsg.includes('❌')
                      ? 'rgba(239,68,68,0.1)'
                      : 'rgba(25,63,48,0.1)',
                  fontSize: '13px',
                }}>
                  {translateCopy(syncMsg)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Manual Onboarding Trigger */}
      <OnboardingModal isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />

      {/* Feedback Trigger */}
      <FeedbackModal isOpen={showFeedback} onClose={() => setShowFeedback(false)} />
    </>
  );
}
