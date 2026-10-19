'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePomodoro } from '@/lib/pomodoroContext';
import { usePremium } from '@superapp/shared/premium';
import {
  LayoutDashboard, Trophy, CheckSquare, Flame, Timer, Target,
  Wallet, Dumbbell, NotebookPen, BookMarked, CalendarDays,
  Settings, Menu, X, Coffee, TreePalm, Users
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { useLanguage } from "@superapp/shared/language";




export default function Sidebar() {
  const { tx: translateCopy } = useLanguage();
const NAV_ITEMS = [
  { href: '/', icon: <LayoutDashboard size={17} />, label: translateCopy("Beranda") },
  { href: '/tasks', icon: <CheckSquare size={17} />, label: translateCopy("Tugas") },
  { href: '/habits', icon: <Flame size={17} />, label: translateCopy("Kebiasaan") },
  { href: '/goals', icon: <Target size={17} />, label: translateCopy("Tujuan") },
  { href: '/finance', icon: <Wallet size={17} />, label: translateCopy("Keuangan") },
  { href: '/journal', icon: <NotebookPen size={17} />, label: translateCopy("Jurnal") },
  { href: '/calendar', icon: <CalendarDays size={17} />, label: translateCopy("Kalender") },
  { href: '/insights', icon: <LayoutDashboard size={17} />, label: 'Insight' },
  { section: translateCopy("Ruang lainnya") },
  { href: '/pomodoro', icon: <Timer size={17} />, label: translateCopy("Waktu Fokus") },
  { href: '/health', icon: <Dumbbell size={17} />, label: translateCopy("Kesehatan") },
  { href: '/reading', icon: <BookMarked size={17} />, label: translateCopy("Bacaan") },
  { href: '/achievements', icon: <Trophy size={17} />, label: translateCopy("Pencapaian") },
  { href: '/squads', icon: <Users size={17} />, label: translateCopy("Komunitas") },
  { href: '/settings', icon: <Settings size={17} />, label: translateCopy("Pengaturan") },
];

  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { isRunning, timeLeft, mode } = usePomodoro();
  const { isPremium } = usePremium();

  useEffect(() => {
    document.title = 'Whenya — Your Life, In Sync.';
  }, []);

  return (
    <>
      <button
        className="mobile-toggle"
        onClick={() => setOpen(!open)}
        aria-label={open ? translateCopy("Tutup navigasi") : translateCopy("Buka navigasi")}
        aria-expanded={open}
      >
        {open ? <X size={24} /> : <Menu size={24} />}
      </button>

      <div
        className={`sidebar-overlay ${open ? 'show' : ''}`}
        onClick={() => setOpen(false)}
      />

      <aside className={`sidebar ${open ? 'open' : ''}`} aria-label={translateCopy("Navigasi utama")}>
        <div className="sidebar-brand">
          <BrandLogo size={38} variant="horizontal" />
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
                ? 'rgba(25,63,48,0.15)'
                : mode === 'break'
                  ? 'rgba(16,185,129,0.15)'
                  : 'rgba(6,182,212,0.15)',
              border: `1px solid ${mode === 'focus' ? 'rgba(25,63,48,0.4)' : mode === 'break' ? 'rgba(16,185,129,0.4)' : 'rgba(6,182,212,0.4)'}`,
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
                {mode === 'focus' ? translateCopy("Fokus") : mode === 'break' ? translateCopy("Istirahat") : translateCopy("Long Break")}
              </span>
            </div>
          </Link>
        )}

        <nav className="sidebar-nav" aria-label={translateCopy("Menu Whenya")}>
          {NAV_ITEMS.map((item, i) => {
            if (item.section) {
              return <div key={i} className="sidebar-section-label">{item.section}</div>;
            }
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => setOpen(false)}
              >
                <span className="sidebar-link-icon">{item.icon}</span>
                <span className="sidebar-link-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Upgrade ke Pro Promo Card (if not yet premium) */}
        {!isPremium && (
          <div style={{
            margin: '12px 14px 20px',
            padding: '14px 16px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(200, 173, 128, 0.15), rgba(25, 63, 48, 0.12))',
            border: '1px solid rgba(200, 173, 128, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)' }}>
              <span style={{ fontSize: '15px' }}>⭐</span> {translateCopy("Upgrade ke Pro")}
            </div>
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              {translateCopy("Dapatkan fitur lengkap untuk perjalanan hidupmu.")}
            </p>
            <Link
              href="/premium"
              style={{
                marginTop: '4px',
                padding: '7px 12px',
                borderRadius: '8px',
                background: '#193F30',
                color: '#ffffff',
                fontSize: '11.5px',
                fontWeight: '700',
                textAlign: 'center',
                textDecoration: 'none',
                display: 'block',
                transition: 'opacity 0.2s',
              }}
              onClick={() => setOpen(false)}
            >
              {translateCopy("Upgrade Sekarang")}
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
