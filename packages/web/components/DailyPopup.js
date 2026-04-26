'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles, Quote } from 'lucide-react';

export default function DailyPopup({ quote, roast }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Determine whether to show popup today
    const todayStr = new Date().toISOString().split('T')[0];
    const lastSeen = localStorage.getItem('superapp_daily_popup_seen');
    if (lastSeen !== todayStr && (quote || roast)) {
      setIsOpen(true);
      localStorage.setItem('superapp_daily_popup_seen', todayStr);
    }
  }, [quote, roast]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={() => setIsOpen(false)}>
      <div 
        className="modal" 
        onClick={e => e.stopPropagation()} 
        style={{ maxWidth: '450px', position: 'relative', overflow: 'hidden' }}
      >
        <button 
          onClick={() => setIsOpen(false)} 
          className="btn btn-icon" 
          style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10 }}
        >
          <X size={20} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ 
            width: '64px', height: '64px', borderRadius: '50%', 
            background: 'var(--gradient-primary)', margin: '0 auto 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
          }}>
            <Sparkles size={32} />
          </div>
          <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>Selamat datang!</h2>
          <p className="text-secondary">Ini ringkasan energi untukmu hari ini.</p>
        </div>

        {roast && (
          <div style={{
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-color)',
            padding: '16px', borderRadius: '12px', marginBottom: '16px',
            display: 'flex', gap: '12px', alignItems: 'flex-start'
          }}>
            <span style={{ fontSize: '24px' }}>💡</span>
            <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.5, color: 'var(--text-primary)' }}>
              {roast.text}
            </p>
          </div>
        )}

        {quote && (
          <div style={{
            background: 'rgba(139, 92, 246, 0.05)',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            padding: '16px', borderRadius: '12px',
            position: 'relative'
          }}>
            <Quote size={20} color="var(--accent-purple)" style={{ opacity: 0.5, marginBottom: '8px' }} />
            <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontStyle: 'italic', lineHeight: 1.5, color: 'var(--text-primary)' }}>
              "{quote.text}"
            </p>
            <p style={{ margin: 0, fontSize: '12px', textAlign: 'right', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
              — {quote.author}
            </p>
          </div>
        )}

        <button 
          className="btn btn-primary w-full mt-4" 
          onClick={() => setIsOpen(false)}
          style={{ padding: '12px' }}
        >
          Mulai Produktivitas
        </button>
      </div>
    </div>
  );
}
