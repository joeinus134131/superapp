'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { useUser } from '@/lib/auth';
import XPBar from './XPBar';
import { exportAllData, importData, getStorageSize } from '@/lib/backup';
import { pushToCloud, pullFromCloud, getSyncId } from '@/lib/cloudSync';
import { usePomodoro, MODES } from '@/lib/pomodoroContext';

const NAV_ITEMS = [
  { section: 'Overview' },
  { href: '/', icon: '📊', label: 'Dashboard' },
  { href: '/achievements', icon: '🏆', label: 'Achievements' },
  { section: 'Productivity' },
  { href: '/tasks', icon: '✅', label: 'Task Manager' },
  { href: '/habits', icon: '🔥', label: 'Habit Tracker' },
  { href: '/pomodoro', icon: '⏱️', label: 'Pomodoro Timer' },
  { href: '/goals', icon: '🎯', label: 'Goal Setting' },
  { section: 'Life' },
  { href: '/finance', icon: '💰', label: 'Finance Tracker' },
  { href: '/health', icon: '💪', label: 'Health & Fitness' },
  { href: '/journal', icon: '📝', label: 'Journal & Notes' },
  { section: 'Growth' },
  { href: '/reading', icon: '📚', label: 'Reading List' },
  { href: '/calendar', icon: '📅', label: 'Calendar' },
  { section: 'System' },
  { href: '/notifications', icon: '🔔', label: 'Notifikasi' },
  { href: '/settings', icon: '⚙️', label: 'Settings' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { user, logout } = useUser();
  const { isRunning, timeLeft, mode, toggleTimer } = usePomodoro();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [storageInfo, setStorageInfo] = useState(null);
  const [importMsg, setImportMsg] = useState(null);
  const fileRef = useRef(null);

  // Cloud sync state
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncMsg, setSyncMsg] = useState(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [pullId, setPullId] = useState('');
  const [currentSyncId, setCurrentSyncId] = useState(null);

  useEffect(() => {
    setStorageInfo(getStorageSize());
    setCurrentSyncId(getSyncId());

    // Dynamic Title & Favicon
    if (user) {
      document.title = user.appName || 'SuperApp';
      const emoji = user.appIcon || '⚡';
      const canvas = document.createElement('canvas');
      canvas.height = 64; canvas.width = 64;
      const ctx = canvas.getContext('2d');
      ctx.font = '54px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(emoji, 32, 38);
      
      let link = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'shortcut icon';
        document.head.appendChild(link);
      }
      link.href = canvas.toDataURL();
    }
  }, [user]);

  const handleExport = () => {
    exportAllData();
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const result = await importData(file);
      setImportMsg(`✅ Restored ${result.keys} items`);
      setTimeout(() => { setImportMsg(null); window.location.reload(); }, 2000);
    } catch (err) {
      setImportMsg(`❌ ${err.message}`);
      setTimeout(() => setImportMsg(null), 3000);
    }
    e.target.value = '';
  };

  const handlePush = async () => {
    setSyncLoading(true);
    setSyncMsg(null);
    try {
      const result = await pushToCloud();
      setCurrentSyncId(result.syncId);
      setSyncMsg(`✅ Data di-sync! Sync ID: ${result.syncId.slice(-8)}`);
    } catch (err) {
      setSyncMsg(`❌ ${err.message}`);
    }
    setSyncLoading(false);
  };

  const handlePull = async () => {
    if (!pullId.trim()) return;
    setSyncLoading(true);
    setSyncMsg(null);
    try {
      const result = await pullFromCloud(pullId.trim());
      setSyncMsg(`✅ Restored ${result.keysRestored} items!`);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setSyncMsg(`❌ ${err.message}`);
    }
    setSyncLoading(false);
  };

  const copySyncId = () => {
    if (currentSyncId) {
      navigator.clipboard.writeText(currentSyncId);
      setSyncMsg('📋 Sync ID copied!');
      setTimeout(() => setSyncMsg(null), 2000);
    }
  };

  // Avatar display helper
  const renderAvatar = (size = '100%') => {
    if (user?.customPhoto) {
      return (
        <img src={user.customPhoto} alt="Avatar"
          style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />
      );
    }
    return user?.avatar || '😎';
  };

  return (
    <>
      <button className="mobile-toggle" onClick={() => setOpen(!open)}>
        {open ? '✕' : '☰'}
      </button>
      <div className={`sidebar-overlay ${open ? 'show' : ''}`} onClick={() => setOpen(false)} />
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">{user?.appIcon || '⚡'}</div>
          <div>
            <h1>{user?.appName || 'SuperApp'}</h1>
            <p>{user?.appTagline || 'Personal Management'}</p>
          </div>
        </div>

        {/* XP Bar */}
        <div style={{ padding: '0 12px', marginBottom: '8px' }}>
          <XPBar />
        </div>

        {/* Mini Pomodoro Timer Pill — visible from any page */}
        {isRunning && (
          <Link
            href="/pomodoro"
            style={{ textDecoration: 'none' }}
            onClick={() => setOpen(false)}
          >
            <div style={{
              margin: '0 12px 8px',
              padding: '8px 12px',
              borderRadius: '12px',
              background: mode === 'focus'
                ? 'rgba(139,92,246,0.15)'
                : mode === 'break'
                  ? 'rgba(16,185,129,0.15)'
                  : 'rgba(6,182,212,0.15)',
              border: `1px solid ${mode === 'focus' ? 'rgba(139,92,246,0.4)' : mode === 'break' ? 'rgba(16,185,129,0.4)' : 'rgba(6,182,212,0.4)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
            }}>
              <span style={{
                width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                background: mode === 'focus' ? 'var(--accent-purple)' : mode === 'break' ? 'var(--accent-green)' : 'var(--accent-cyan)',
                animation: 'pulse 1.5s infinite',
              }} />
              <span style={{ fontSize: '14px' }}>{mode === 'focus' ? '🔥' : mode === 'break' ? '☕' : '🌴'}</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', flex: 1 }}>
                {String(Math.floor(timeLeft / 60)).padStart(2,'0')}:{String(timeLeft % 60).padStart(2,'0')}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {mode === 'focus' ? 'Fokus' : mode === 'break' ? 'Istirahat' : 'Long Break'}
              </span>
            </div>
          </Link>
        )}

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item, i) => {
            if (item.section) {
              return <div key={i} className="sidebar-section-label">{item.section}</div>;
            }
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
                onClick={() => setOpen(false)}>
                <span className="sidebar-link-icon">{item.icon}</span>
                <span className="sidebar-link-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Profile */}
        {user && (
          <div className="sidebar-user">
            <button className="sidebar-user-btn" onClick={() => setShowUserMenu(!showUserMenu)}>
              <span className="sidebar-user-avatar">{renderAvatar()}</span>
              <div className="sidebar-user-info">
                <span className="sidebar-user-name">{user.name}</span>
                <span className="sidebar-user-status">Online</span>
              </div>
              <span className="sidebar-user-more">{showUserMenu ? '▲' : '▼'}</span>
            </button>
            {showUserMenu && (
              <div className="sidebar-user-menu">
                {/* Storage Info */}
                {storageInfo && (
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)' }}>
                    <div className="text-xs text-muted" style={{ marginBottom: '4px' }}>
                      💾 Storage: {storageInfo.usedMB} MB / 5 MB ({storageInfo.percent}%)
                    </div>
                    <div className="storage-bar">
                      <div className="storage-bar-fill" style={{ width: `${storageInfo.percent}%` }} />
                    </div>
                  </div>
                )}
                <button className="sidebar-user-menu-item" onClick={handleExport}>
                  <span>📥</span><span>Backup Data (Export)</span>
                </button>
                <button className="sidebar-user-menu-item" onClick={() => fileRef.current?.click()}>
                  <span>📤</span><span>Restore Data (Import)</span>
                </button>
                <input ref={fileRef} type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
                {importMsg && (
                  <div style={{ padding: '6px 12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {importMsg}
                  </div>
                )}
                <button className="sidebar-user-menu-item" onClick={() => { setShowSyncModal(true); setShowUserMenu(false); }}>
                  <span>☁️</span><span>Cloud Sync</span>
                </button>
                <button className="sidebar-user-menu-item" onClick={logout}>
                  <span>🚪</span><span>Keluar / Ganti User</span>
                </button>
              </div>
            )}
          </div>
        )}
      </aside>

      {/* Cloud Sync Modal */}
      {showSyncModal && (
        <div className="modal-overlay" onClick={() => setShowSyncModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h2>☁️ Cloud Sync</h2>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowSyncModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p className="text-sm text-secondary mb-2">
                Sync data ke cloud gratis via jsonblob.com. Simpan Sync ID untuk akses dari device lain.
              </p>

              {/* Push Section */}
              <div className="card card-padding mb-2" style={{ background: 'var(--bg-glass)' }}>
                <h4 style={{ marginBottom: '8px' }}>📤 Upload ke Cloud</h4>
                <button className="btn btn-primary w-full" onClick={handlePush} disabled={syncLoading}>
                  {syncLoading ? '⏳ Uploading...' : '🚀 Sync Sekarang'}
                </button>
                {currentSyncId && (
                  <div style={{ marginTop: '8px' }}>
                    <div className="text-xs text-secondary">Sync ID kamu:</div>
                    <div className="flex items-center gap-1" style={{ marginTop: '4px' }}>
                      <code style={{
                        flex: 1, padding: '6px 10px', background: 'var(--bg-card)',
                        borderRadius: 'var(--radius-md)', fontSize: '12px', fontFamily: 'monospace',
                        wordBreak: 'break-all', color: 'var(--accent-purple)',
                      }}>
                        {currentSyncId}
                      </code>
                      <button className="btn btn-secondary btn-sm" onClick={copySyncId}>📋</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Pull Section */}
              <div className="card card-padding" style={{ background: 'var(--bg-glass)' }}>
                <h4 style={{ marginBottom: '8px' }}>📥 Download dari Cloud</h4>
                <p className="text-xs text-secondary mb-1">Masukkan Sync ID dari device lain:</p>
                <div className="flex gap-1">
                  <input
                    className="form-input"
                    value={pullId}
                    onChange={e => setPullId(e.target.value)}
                    placeholder="Paste Sync ID..."
                    style={{ flex: 1, fontSize: '13px' }}
                  />
                  <button className="btn btn-primary" onClick={handlePull} disabled={syncLoading || !pullId.trim()}>
                    {syncLoading ? '⏳' : '📥'}
                  </button>
                </div>
              </div>

              {syncMsg && (
                <div style={{
                  marginTop: '12px', padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: syncMsg.includes('✅') ? 'rgba(16,185,129,0.1)' : syncMsg.includes('❌') ? 'rgba(239,68,68,0.1)' : 'rgba(139,92,246,0.1)',
                  fontSize: '13px',
                }}>
                  {syncMsg}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
