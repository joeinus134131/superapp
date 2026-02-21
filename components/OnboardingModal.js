'use client';

import { useState, useEffect } from 'react';
import { LayoutDashboard, CheckSquare, Flame, Timer, Target, X, ChevronRight, ChevronLeft } from 'lucide-react';
import { useLanguage } from '@/lib/language';

const STEPS_DATA = [
  {
    titleKey: 'step1_title',
    descKey: 'step1_desc',
    icon: <LayoutDashboard size={64} color="var(--accent-purple)" />,
  },
  {
    titleKey: 'step2_title',
    descKey: 'step2_desc',
    icon: <CheckSquare size={64} color="var(--accent-cyan)" />,
  },
  {
    titleKey: 'step3_title',
    descKey: 'step3_desc',
    icon: <Flame size={64} color="var(--accent-red)" />,
  },
  {
    titleKey: 'step4_title',
    descKey: 'step4_desc',
    icon: <Timer size={64} color="var(--accent-green)" />,
  },
  {
    titleKey: 'step5_title',
    descKey: 'step5_desc',
    icon: <Target size={64} color="var(--accent-yellow)" />,
  },
];

export default function OnboardingModal({ isOpen, onClose }) {
  const [currentStep, setCurrentStep] = useState(0);
  const { t } = useLanguage();

  // Initialize directly if requested manually, reset to 0 when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(curr => curr + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(curr => curr - 1);
    }
  };

  const step = STEPS_DATA[currentStep];

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', textAlign: 'center', padding: '0' }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>

        <div style={{ padding: '40px 32px 32px' }}>
          <div style={{ display: 'inline-flex', justifyContent: 'center', alignItems: 'center', width: '120px', height: '120px', borderRadius: '50%', background: 'var(--bg-secondary)', marginBottom: '24px' }}>
            {step.icon}
          </div>

          <h2 style={{ fontSize: '24px', marginBottom: '12px' }}>{t(`onboarding.${step.titleKey}`)}</h2>
          <p className="text-secondary" style={{ fontSize: '15px', lineHeight: '1.6', marginBottom: '32px', minHeight: '72px' }}>
            {t(`onboarding.${step.descKey}`)}
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '32px' }}>
            {STEPS_DATA.map((_, idx) => (
              <div
                key={idx}
                style={{
                  width: idx === currentStep ? '24px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  background: idx === currentStep ? 'var(--accent-purple)' : 'var(--border-color)',
                  transition: 'all 0.3s ease'
                }}
              />
            ))}
          </div>

          <div className="flex justify-between items-center w-full">
            <button
              className="btn btn-secondary"
              onClick={handlePrev}
              style={{ visibility: currentStep === 0 ? 'hidden' : 'visible', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <ChevronLeft size={16} /> {t('onboarding.prev')}
            </button>
            
            <div className="flex gap-2">
              <button
                className="btn btn-secondary"
                onClick={onClose}
                style={{ display: currentStep === STEPS_DATA.length - 1 ? 'none' : 'block' }}
              >
                {t('onboarding.skip')}
              </button>
              <button
                className="btn btn-primary"
                onClick={handleNext}
                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                {currentStep === STEPS_DATA.length - 1 ? t('onboarding.start') : t('onboarding.next')} {currentStep !== STEPS_DATA.length - 1 && <ChevronRight size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
