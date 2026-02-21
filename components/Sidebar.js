'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { useUser } from '@/lib/auth';
import XPBar from './XPBar';
import { exportAllData, importData, getStorageSize } from '@/lib/backup';
import { pushToCloud, pullFromCloud, getSyncId } from '@/lib/cloudSync';
import { usePomodoro, MODES } from '@/lib/pomodoroContext';
import { usePremium } from '@/lib/premium';
import {
  LayoutDashboard, Trophy, CheckSquare, Flame, Timer, Target,
  Wallet, Dumbbell, NotebookPen, BookMarked, CalendarDays,
  Gem, Bell, Settings, DownloadCloud, UploadCloud, Cloud, LogOut,
  Menu, X, Coffee, TreePalm, Database, Copy
} from 'lucide-react';

const NAV_ITEMS = [
  { section: 'Overview' },
  { href: '/', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
  { href: '/achievements', icon: <Trophy size={18} />, label: 'Achievements' },
  { section: 'Productivity' },
  { href: '/tasks', icon: <CheckSquare size={18} />, label: 'Task Manager' },
  { href: '/habits', icon: <Flame size={18} />, label: 'Habit Tracker' },
  { href: '/pomodoro', icon: <Timer size={18} />, label: 'Pomodoro Timer' },
  { href: '/goals', icon: <Target size={18} />, label: 'Goal Setting' },
  { section: 'Life' },
  { href: '/finance', icon: <Wallet size={18} />, label: 'Finance Tracker' },
  { href: '/health', icon: <Dumbbell size={18} />, label: 'Health & Fitness' },
  { href: '/journal', icon: <NotebookPen size={18} />, label: 'Journal & Notes' },
  { section: 'Growth' },
  { href: '/reading', icon: <BookMarked size={18} />, label: 'Reading List' },
  { href: '/calendar', icon: <CalendarDays size={18} />, label: 'Calendar' },
  { section: 'System' },
  { href: '/premium', icon: <Gem size={18} />, label: 'Premium Store' },
  { href: '/notifications', icon: <Bell size={18} />, label: 'Notifikasi' },
  { href: '/settings', icon: <Settings size={18} />, label: 'Settings' },
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

  // Premium data
  const { balance, storageLimitMB, isPremium } = usePremium();

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
        {open ? <X size={24} /> : <Menu size={24} />}
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
              <span style={{ fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {mode === 'focus' ? <Flame size={14} /> : mode === 'break' ? <Coffee size={14} /> : <TreePalm size={14} />}
              </span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', flex: 1 }}>
                {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}
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
                {/* Premium Info */}
                <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="text-xs font-semibold">{isPremium ? '🌟 Premium' : 'Standard'}</span>
                  <span className="text-xs font-bold" style={{ color: 'var(--accent-purple)' }}>{balance} Token</span>
                </div>

                {/* Storage Info */}
                {storageInfo && (
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)' }}>
                    <div className="text-xs text-muted" style={{ marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Database size={12} /> {storageInfo.usedMB} MB / {storageLimitMB} MB</span>
                      <span>{Math.round((storageInfo.used / (storageLimitMB * 1024 * 1024)) * 100)}%</span>
                    </div>
                    <div className="storage-bar">
                      <div className="storage-bar-fill" style={{ width: `${Math.round((storageInfo.used / (storageLimitMB * 1024 * 1024)) * 100)}%`, background: isPremium ? 'var(--accent-purple)' : 'var(--accent-cyan)' }} />
                    </div>
                  </div>
                )}
                <button className="sidebar-user-menu-item" onClick={handleExport}>
                  <span><DownloadCloud size={16} /></span><span>Backup Data (Export)</span>
                </button>
                <button className="sidebar-user-menu-item" onClick={() => fileRef.current?.click()}>
                  <span><UploadCloud size={16} /></span><span>Restore Data (Import)</span>
                </button>
                <input ref={fileRef} type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
                {importMsg && (
                  <div style={{ padding: '6px 12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {importMsg}
                  </div>
                )}
                <button className="sidebar-user-menu-item" onClick={() => { setShowSyncModal(true); setShowUserMenu(false); }}>
                  <span><Cloud size={16} /></span><span>Cloud Sync</span>
                </button>
                <button className="sidebar-user-menu-item" onClick={logout}>
                  <span><LogOut size={16} /></span><span>Keluar / Ganti User</span>
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
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Cloud size={20} /> Cloud Sync</h2>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowSyncModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <p className="text-sm text-secondary mb-2">
                Sync data kamu secara aman. Simpan Sync ID untuk akses dari device lain.
                {isPremium && <span style={{ marginLeft: '8px', background: 'rgba(16,185,129,0.15)', color: 'var(--accent-green)', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>🛡️ Secured by Supabase</span>}
              </p>

              {/* Push Section */}
              <div className="card card-padding mb-2" style={{ background: 'var(--bg-glass)' }}>
                <h4 style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}><UploadCloud size={16} /> Upload ke Cloud</h4>
                <button className="btn btn-primary w-full" onClick={handlePush} disabled={syncLoading} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
                  {syncLoading ? '⏳ Uploading...' : <><Cloud size={16} /> Sync Sekarang</>}
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
                      <button className="btn btn-secondary btn-sm" onClick={copySyncId} title="Copy" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Copy size={14} /></button>
                    </div>
                  </div>
                )}
              </div>

              {/* Pull Section */}
              <div className="card card-padding" style={{ background: 'var(--bg-glass)' }}>
                <h4 style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}><DownloadCloud size={16} /> Download dari Cloud</h4>
                <p className="text-xs text-secondary mb-1">Masukkan Sync ID dari device lain:</p>
                <div className="flex gap-1">
                  <input
                    className="form-input"
                    value={pullId}
                    onChange={e => setPullId(e.target.value)}
                    placeholder="Paste Sync ID..."
                    style={{ flex: 1, fontSize: '13px' }}
                  />
                  <button className="btn btn-primary" onClick={handlePull} disabled={syncLoading || !pullId.trim()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {syncLoading ? '⏳' : <DownloadCloud size={16} />}
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
