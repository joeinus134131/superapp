'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { useUser } from '@/lib/auth';

const NAV_ITEMS = [
  { section: 'Overview' },
  { href: '/', icon: '📊', label: 'Dashboard' },
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
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { user, logout } = useUser();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <>
      <button className="mobile-toggle" onClick={() => setOpen(!open)}>
        {open ? '✕' : '☰'}
      </button>
      <div className={`sidebar-overlay ${open ? 'show' : ''}`} onClick={() => setOpen(false)} />
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">⚡</div>
          <div>
            <h1>SuperApp</h1>
            <p>Personal Management</p>
          </div>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item, i) => {
            if (item.section) {
              return (
                <div key={i} className="sidebar-section-label">
                  {item.section}
                </div>
              );
            }
            const isActive = item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
                onClick={() => setOpen(false)}
              >
                <span className="sidebar-link-icon">{item.icon}</span>
                <span className="sidebar-link-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Profile Section */}
        {user && (
          <div className="sidebar-user">
            <button className="sidebar-user-btn" onClick={() => setShowUserMenu(!showUserMenu)}>
              <span className="sidebar-user-avatar">{user.avatar}</span>
              <div className="sidebar-user-info">
                <span className="sidebar-user-name">{user.name}</span>
                <span className="sidebar-user-status">Online</span>
              </div>
              <span className="sidebar-user-more">{showUserMenu ? '▲' : '▼'}</span>
            </button>
            {showUserMenu && (
              <div className="sidebar-user-menu">
                <button className="sidebar-user-menu-item" onClick={logout}>
                  <span>🚪</span>
                  <span>Keluar / Ganti User</span>
                </button>
              </div>
            )}
          </div>
        )}
      </aside>
    </>
  );
}
