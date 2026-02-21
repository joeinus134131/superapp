'use client';

import { useState } from 'react';
import { X, MessageSquare, Send, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/lib/language';

const EMOJIS = [
  { value: 1, icon: '😡', label: 'Kecewa' },
  { value: 2, icon: '😕', label: 'Kurang' },
  { value: 3, icon: '😐', label: 'Biasa' },
  { value: 4, icon: '🙂', label: 'Bagus' },
  { value: 5, icon: '🤩', label: 'Mantap' },
];

export default function FeedbackModal({ isOpen, onClose }) {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { t } = useLanguage();

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating) return;
    
    setIsSubmitting(true);
    
    try {
      // Get user name to attach to feedback if possible
      let userName = 'Anonymous';
      const userId = localStorage.getItem('superapp_current_user');
      if (userId) {
        const users = JSON.parse(localStorage.getItem('superapp_users') || '[]');
        const user = users.find(u => u.id === userId);
        if (user) userName = user.name;
      }

      const payload = {
        user: userName,
        rating: EMOJIS.find(e => e.value === rating)?.label || rating,
        feedback: feedback
      };

      const webhookUrl = process.env.NEXT_PUBLIC_FEEDBACK_WEBHOOK_URL;
      
      if (webhookUrl && webhookUrl.trim() !== '') {
        // Send to Google Sheets Webhook
        await fetch(webhookUrl, {
          method: 'POST',
          // Mode no-cors is often needed for Google Apps Script to prevent CORS errors in browser
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        // Fallback or local save logic if no webhook provided yet
        const storedFeedback = JSON.parse(localStorage.getItem('superapp_feedback') || '[]');
        storedFeedback.push({
          id: Date.now(),
          rating,
          feedback,
          date: new Date().toISOString()
        });
        localStorage.setItem('superapp_feedback', JSON.stringify(storedFeedback));
      }

      setIsSubmitting(false);
      setIsSuccess(true);
      
      // Auto close after showing success message
      setTimeout(() => {
        handleClose();
      }, 2000);
      
    } catch (error) {
      console.error('Failed to submit feedback', error);
      setIsSubmitting(false);
      // Give success anyway so user experience is uninterrupted
      setIsSuccess(true);
      setTimeout(() => handleClose(), 2000);
    }
  };

  const handleClose = () => {
    // Reset state before closing
    setTimeout(() => {
      setRating(0);
      setFeedback('');
      setIsSuccess(false);
    }, 300);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose} style={{ zIndex: 10000 }}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={20} color="var(--accent-purple)" /> {t('feedback.title')}
          </h2>
          <button className="btn btn-icon btn-secondary" onClick={handleClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          {isSuccess ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ display: 'inline-flex', justifyContent: 'center', alignItems: 'center', width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-green)', marginBottom: '16px' }}>
                <CheckCircle2 size={32} />
              </div>
              <h3 style={{ marginBottom: '8px' }}>{t('feedback.success_title')}</h3>
              <p className="text-secondary text-sm">
                {t('feedback.success_desc')}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <p className="text-sm text-secondary mb-3">
                {t('feedback.prompt')}
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                {EMOJIS.map(item => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setRating(item.value)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      opacity: rating === 0 || rating === item.value ? 1 : 0.4,
                      transform: rating === item.value ? 'scale(1.15)' : 'scale(1)',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                  >
                    <span style={{ fontSize: '32px', filter: rating === item.value ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' : 'none' }}>
                      {item.icon}
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: rating === item.value ? 700 : 500, color: rating === item.value ? 'var(--accent-purple)' : 'var(--text-secondary)' }}>
                      {t(`feedback.rating${item.value}`)}
                    </span>
                  </button>
                ))}
              </div>

              <div className="form-group mb-4">
                <textarea
                  className="form-input"
                  placeholder={t('feedback.placeholder')}
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  rows={4}
                  style={{ resize: 'none' }}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={!rating || isSubmitting}
                style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
              >
                {isSubmitting ? (
                  t('feedback.submitting')
                ) : (
                  <>{t('feedback.submit')} <Send size={16} /></>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
