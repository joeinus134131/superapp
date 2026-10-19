'use client';

import { useEffect, useState } from 'react';
import { CalendarCheck, ChevronLeft, ChevronRight, NotebookPen, ShieldCheck, Target, Sparkles, Check, X } from 'lucide-react';
import { getData, setData, STORAGE_KEYS } from '@/lib/storage';
import { useToast } from '@/lib/toastContext';
import { useLanguage } from "@superapp/shared/language";




export default function OnboardingModal({ isOpen, onClose }) {
  const { tx: translateCopy } = useLanguage();
const OUTCOMES = [
  { id: 'focus', title: translateCopy("Lebih Fokus & Teratur"), desc: translateCopy("Selesaikan tugas penting tanpa merasa kewalahan."), icon: Target },
  { id: 'finance', title: translateCopy("Finansial Terkendali"), desc: translateCopy("Catat pengeluaran dan jaga ritme keuangan harian."), icon: NotebookPen },
  { id: 'health', title: translateCopy("Habit & Kesehatan"), desc: translateCopy("Bangun rutinitas konsisten dan pantau kebugaran."), icon: CalendarCheck },
  { id: 'all', title: translateCopy("Semuanya Sekaligus"), desc: translateCopy("Kelola seluruh aspek kehidupan dalam satu ruang."), icon: Sparkles },
];

  const [currentStep, setCurrentStep] = useState(0);
  const [selectedOutcome, setSelectedOutcome] = useState('focus');
  const [firstActionTitle, setFirstActionTitle] = useState('');
  const [storagePreference, setStoragePreference] = useState('local');
  const { showSuccess } = useToast();

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleFinish = async () => {
    // If the user created a first action, save it into tasks
    if (firstActionTitle.trim()) {
      const existingTasks = (await getData(STORAGE_KEYS.TASKS)) || [];
      const newTask = {
        id: 't_onboarding_' + Date.now(),
        title: firstActionTitle.trim(),
        priority: 'high',
        category: selectedOutcome === 'finance' ? 'Finansial' : selectedOutcome === 'health' ? translateCopy("Kesehatan") : translateCopy("Personal"),
        status: 'todo',
        createdAt: new Date().toISOString(),
      };
      existingTasks.unshift(newTask);
      await setData(STORAGE_KEYS.TASKS, existingTasks);
      window.dispatchEvent(new Event('storage_update'));
      showSuccess(translateCopy("Aksi pertamamu \"{0}\" telah disiapkan di Hari Ini!", [newTask.title]));
    }

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <section
        className="modal onboarding-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        onClick={(event) => event.stopPropagation()}
        style={{ maxWidth: '520px' }}
      >
        <button className="onboarding-close" onClick={onClose} aria-label={translateCopy("Tutup panduan")}>
          <X size={20} />
        </button>

        <div className="onboarding-content">
          <p className="eyebrow">{translateCopy("Aktivasi Ruang Personal · Langkah")} {currentStep + 1} {translateCopy("dari 4")}</p>

          {/* STEP 1: Value Proposition */}
          {currentStep === 0 && (
            <div>
              <div className="onboarding-icon" aria-hidden="true">
                <Sparkles size={32} />
              </div>
              <h2 id="onboarding-title">{translateCopy("Satu tempat untuk membuat harimu lebih terarah.")}</h2>
              <p className="onboarding-description">
                {translateCopy("Whenya dirancang bukan untuk menambah kesibukan, melainkan memberi kejelasan. Mulai dari satu hal penting setiap hari.")}
              </p>
            </div>
          )}

          {/* STEP 2: Outcome-First Selection */}
          {currentStep === 1 && (
            <div>
              <h2 id="onboarding-title">{translateCopy("Apa fokus utamamu saat ini?")}</h2>
              <p className="onboarding-description">{translateCopy("Pilihan ini membantu menyesuaikan apa yang paling awal kamu lihat.")}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '16px', textAlign: 'left' }}>
                {OUTCOMES.map((item) => {
                  const Icon = item.icon;
                  const isSelected = selectedOutcome === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedOutcome(item.id)}
                      style={{
                        padding: '14px',
                        borderRadius: '12px',
                        background: isSelected ? 'rgba(105,65,198,0.12)' : 'var(--bg-card)',
                        border: `1.5px solid ${isSelected ? 'var(--accent-purple)' : 'var(--border-color)'}`,
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Icon size={18} color={isSelected ? 'var(--accent-purple)' : 'var(--text-secondary)'} />
                        {isSelected && <Check size={16} color="var(--accent-purple)" />}
                      </div>
                      <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{item.title}</strong>
                      <small style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.3 }}>{item.desc}</small>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: First Actionable Item */}
          {currentStep === 2 && (
            <div>
              <div className="onboarding-icon" aria-hidden="true">
                <CalendarCheck size={32} />
              </div>
              <h2 id="onboarding-title">{translateCopy("Tentukan tindakan pertamamu.")}</h2>
              <p className="onboarding-description">
                {translateCopy("Apa satu hal nyata yang ingin kamu selesaikan hari ini?")}
              </p>
              <div style={{ marginTop: '16px', textAlign: 'left' }}>
                <input
                  className="login-input"
                  style={{ width: '100%', fontSize: '14px', padding: '12px 14px' }}
                  placeholder={translateCopy("Contoh: Baca bab 1 buku, atau bayar tagihan listrik")}
                  value={firstActionTitle}
                  onChange={(e) => setFirstActionTitle(e.target.value)}
                  autoFocus
                />
                <small style={{ display: 'block', marginTop: '8px', color: 'var(--text-muted)' }}>
                  {translateCopy("Bisa dilewati bila kamu ingin eksplorasi modul terlebih dahulu.")}
                </small>
              </div>
            </div>
          )}

          {/* STEP 4: Privacy & Storage */}
          {currentStep === 3 && (
            <div>
              <div className="onboarding-icon" aria-hidden="true">
                <ShieldCheck size={32} />
              </div>
              <h2 id="onboarding-title">{translateCopy("Privasimu adalah prioritas kami.")}</h2>
              <p className="onboarding-description">
                {translateCopy("Semua data tersimpan secara lokal di perangkatmu. Kamu memegang kendali penuh kapan ingin mencadangkan ke cloud.")}
              </p>
              <div
                style={{
                  marginTop: '16px',
                  padding: '14px',
                  borderRadius: '12px',
                  background: 'var(--bg-glass)',
                  border: '1px solid var(--border-color)',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '16px' }}>🛡️</span>
                  <strong style={{ fontSize: '13px' }}>{translateCopy("Model Penyimpanan Offline-First")}</strong>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                  {translateCopy("Data keuangan, jurnal, dan tugasmu tidak dikirim ke server tanpa izin enkripsi milikmu.")}
                </p>
              </div>
            </div>
          )}

          {/* Dots Indicator */}
          <div className="onboarding-dots" aria-hidden="true" style={{ marginTop: '20px' }}>
            {[0, 1, 2, 3].map((idx) => (
              <span key={idx} className={idx === currentStep ? 'active' : ''} />
            ))}
          </div>

          {/* Actions */}
          <div className="onboarding-actions" style={{ marginTop: '20px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setCurrentStep((step) => step - 1)}
              disabled={currentStep === 0}
            >
              <ChevronLeft size={16} /> {translateCopy("Kembali")}
            </button>
            <div className="flex gap-2">
              {currentStep < 3 ? (
                <>
                  <button type="button" className="btn btn-secondary" onClick={onClose}>
                    {translateCopy("Lewati")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setCurrentStep((step) => step + 1)}
                  >
                    {translateCopy("Lanjut")} <ChevronRight size={16} />
                  </button>
                </>
              ) : (
                <button type="button" className="btn btn-primary" onClick={handleFinish}>
                  {translateCopy("Mulai ke Hari Ini")} <ChevronRight size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
