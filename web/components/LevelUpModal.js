'use client';

import { useState, useEffect } from 'react';
import Confetti from './Confetti';

export default function LevelUpModal({ level, onClose }) {
  const [showConfetti, setShowConfetti] = useState(true);

  if (!level) return null;

  return (
    <>
      <Confetti active={showConfetti} onDone={() => setShowConfetti(false)} />
      <div 
        className="modal-overlay" 
        onMouseDown={e => {
          if (e.target === e.currentTarget) onClose();
        }} 
        style={{ zIndex: 10001 }}
      >
        <div className="levelup-modal">
          <div className="levelup-glow" style={{ '--glow-color': level.color, pointerEvents: 'none' }} />
          <div className="levelup-icon" style={{ fontSize: '48px', marginBottom: '16px' }}>✨</div>
          <h2 className="levelup-title" style={{ fontSize: '14px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '2px' }}>
            Chapter Unlocked
          </h2>
          <div className="levelup-level" style={{ color: level.color, fontSize: '28px', fontWeight: '900', margin: '8px 0 16px 0' }}>
            {level.title}
          </div>
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '16px', borderLeft: `4px solid ${level.color}`, marginBottom: '24px' }}>
            <p className="levelup-desc" style={{ fontStyle: 'italic', fontSize: '15px', lineHeight: '1.6', color: 'var(--text-primary)', margin: 0 }}>
              "{level.narrative || 'Kamu naik level! Terus grinding untuk membuka kekuatan baru!'}"
            </p>
          </div>
          <button className="btn btn-primary btn-lg" onClick={onClose} style={{ marginTop: '10px', width: '100%', background: level.color, border: 'none' }}>
            Lanjutkan Perjalanan 🚀
          </button>
        </div>
      </div>
    </>
  );
}
