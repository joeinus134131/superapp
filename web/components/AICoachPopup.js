'use client';

import { useState, useEffect } from 'react';
import { Bot, X } from 'lucide-react';
import { API_URL } from '@/lib/apiConfig';

export default function AICoachPopup() {
  const [message, setMessage] = useState(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Poll every 30 seconds for new unread coach messages
    const fetchMessages = async () => {
      try {
        const token = localStorage.getItem('token') || '';
        const res = await fetch(`${API_URL}/coach/messages`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const json = await res.json();
          if (json.data && json.data.length > 0) {
            const latestMsg = json.data[json.data.length - 1]; // Get the newest
            setMessage(latestMsg);
            setShow(true);
            
            // Trigger browser notification if allowed
            if (Notification.permission === "granted") {
              new Notification(`SelfOne Coach: ${latestMsg.title}`, {
                body: latestMsg.body,
                icon: '/favicon.svg'
              });
            } else if (Notification.permission !== "denied") {
              Notification.requestPermission();
            }
          }
        }
      } catch (e) {
        // Ignore fetch errors during polling
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleDismiss = async () => {
    setShow(false);
    if (!message) return;
    
    // Mark as read in backend
    try {
      const token = localStorage.getItem('token') || '';
      await fetch(`${API_URL}/coach/messages/read`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message_ids: [message.id] })
      });
    } catch (e) {
      console.error(e);
    }
    setMessage(null);
  };

  if (!show || !message) return null;

  let borderColor = 'var(--accent-purple)';
  if (message.type === 'warning') borderColor = 'var(--accent-red)';
  if (message.type === 'praise') borderColor = 'var(--accent-green)';

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      width: '320px',
      backgroundColor: 'var(--bg-card)',
      border: `2px solid ${borderColor}`,
      borderRadius: '16px',
      padding: '16px',
      boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
      zIndex: 9999,
      animation: 'slideUp 0.3s ease-out'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: borderColor }}>
          <Bot size={20} />
          <strong style={{ fontSize: '14px' }}>AI Coach</strong>
        </div>
        <button onClick={handleDismiss} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <X size={18} />
        </button>
      </div>
      <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: 'var(--text-primary)' }}>{message.title}</h4>
      <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
        {message.body}
      </p>

      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(100px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
