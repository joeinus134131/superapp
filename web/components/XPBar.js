'use client';

import { getXP, getCurrentLevel, getNextLevel, getXPProgress } from '@/lib/gamification';

export default function XPBar() {
  let data;
  try { data = getXP(); } catch { data = { totalXP: 0 }; }
  
  const level = getCurrentLevel(data.totalXP);
  const next = getNextLevel(data.totalXP);
  const progress = getXPProgress(data.totalXP);

  return (
    <div className="xp-bar-container">
      <div className="xp-bar-header">
        <span className="xp-level-badge" style={{ borderColor: level.color }}>
          Lv.{level.level}
        </span>
        <span className="xp-level-title">{level.title}</span>
      </div>
      <div className="xp-bar-track">
        <div
          className="xp-bar-fill"
          style={{
            width: `${progress.percent}%`,
            background: `linear-gradient(90deg, ${level.color}, ${level.color}88)`,
          }}
        />
      </div>
      <div className="xp-bar-footer">
        <span>{data.totalXP} XP</span>
        {next && <span>{next.minXP} XP</span>}
      </div>
    </div>
  );
}
