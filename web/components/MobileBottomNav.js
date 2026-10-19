'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CheckSquare, Plus, BarChart3, User } from 'lucide-react';
import { useLanguage } from "@superapp/shared/language";


export default function MobileBottomNav() {
  const { tx: translateCopy } = useLanguage();
  const pathname = usePathname();

  const isToday = pathname === '/';
  const isPlan = pathname === '/tasks' || pathname === '/goals' || pathname === '/calendar';
  const isNotes = pathname === '/insights';
  const isMe = pathname === '/settings' || pathname === '/achievements' || pathname === '/squads' || pathname === '/premium';

  const handleOpenCapture = () => {
    window.dispatchEvent(new CustomEvent('open-quick-capture'));
  };

  return (
    <nav className="web-bottom-nav" aria-label={translateCopy("Navigasi bawah mobile")}>
      <Link href="/" className={`web-bottom-nav-item ${isToday ? 'active' : ''}`}>
        <LayoutDashboard size={20} />
        <span>{translateCopy("Beranda")}</span>
      </Link>

      <Link href="/tasks" className={`web-bottom-nav-item ${isPlan ? 'active' : ''}`}>
        <CheckSquare size={20} />
        <span>{translateCopy("Tugas")}</span>
      </Link>

      <button
        type="button"
        className="web-bottom-nav-capture"
        onClick={handleOpenCapture}
        aria-label={translateCopy("Catat cepat")}
      >
        <Plus size={24} />
      </button>

      <Link href="/insights" className={`web-bottom-nav-item ${isNotes ? 'active' : ''}`}>
        <BarChart3 size={20} />
        <span>{translateCopy("Insight")}</span>
      </Link>

      <Link href="/settings" className={`web-bottom-nav-item ${isMe ? 'active' : ''}`}>
        <User size={20} />
        <span>{translateCopy("Profil")}</span>
      </Link>
    </nav>
  );
}
