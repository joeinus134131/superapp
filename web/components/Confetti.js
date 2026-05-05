'use client';

import { useEffect, useState } from 'react';

const COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#ef4444', '#f97316', '#a855f7'];
const PARTICLE_COUNT = 80;

function randomBetween(a, b) { return a + Math.random() * (b - a); }

export default function Confetti({ active, onDone }) {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (!active) { setParticles([]); return; }

    const p = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id: i,
      x: randomBetween(10, 90),
      y: randomBetween(-20, -5),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: randomBetween(6, 14),
      rotation: randomBetween(0, 360),
      dx: randomBetween(-3, 3),
      dy: randomBetween(2, 6),
      dr: randomBetween(-10, 10),
      opacity: 1,
      shape: Math.random() > 0.5 ? 'rect' : 'circle',
    }));
    setParticles(p);

    const timer = setTimeout(() => {
      setParticles([]);
      onDone && onDone();
    }, 3000);

    return () => clearTimeout(timer);
  }, [active, onDone]);

  if (particles.length === 0) return null;

  return (
    <div className="confetti-container">
      {particles.map(p => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.x}%`,
            backgroundColor: p.color,
            width: p.shape === 'rect' ? `${p.size}px` : `${p.size}px`,
            height: p.shape === 'rect' ? `${p.size * 0.5}px` : `${p.size}px`,
            borderRadius: p.shape === 'circle' ? '50%' : '2px',
            '--fall-x': `${p.dx * 30}px`,
            '--fall-rotation': `${p.rotation + p.dr * 30}deg`,
            animationDuration: `${randomBetween(2, 3.5)}s`,
            animationDelay: `${randomBetween(0, 0.5)}s`,
          }}
        />
      ))}
    </div>
  );
}
