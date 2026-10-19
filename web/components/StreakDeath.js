'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from "@superapp/shared/language";


export default function StreakDeath({ message, onDismiss }) {
  const { tx: translateCopy } = useLanguage();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!message) return;
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss && onDismiss();
    }, 4000);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  if (!visible || !message) return null;

  return (
    <div className="streak-death-overlay" onClick={() => { setVisible(false); onDismiss && onDismiss(); }}>
      <div className="streak-death-content">
        <div className="streak-death-skull">💀</div>
        <div className="streak-death-text">{translateCopy(message)}</div>
        <div className="streak-death-sub">{translateCopy("Tap untuk menutup")}</div>
      </div>
    </div>
  );
}
