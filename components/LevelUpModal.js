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
          <div className="levelup-icon">⬆️</div>
          <h2 className="levelup-title">LEVEL UP!</h2>
          <div className="levelup-level" style={{ color: level.color }}>
            Lv.{level.level} — {level.title}
          </div>
          <p className="levelup-desc">
            Kamu naik level! Terus grinding untuk membuka kekuatan baru! 🔥
          </p>
          <button className="btn btn-primary btn-lg" onClick={onClose} style={{ marginTop: '20px' }}>
            LET&apos;S GO! 🚀
          </button>
        </div>
      </div>
    </>
  );
}
