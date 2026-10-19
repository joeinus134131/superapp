'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { UserProvider } from '@superapp/shared/auth';
import AuthGuard from '@/components/AuthGuard';
import Sidebar from '@/components/Sidebar';
import { PomodoroProvider } from '@/lib/pomodoroContext';
import { PremiumProvider } from '@superapp/shared/premium';
import OnboardingModal from '@/components/OnboardingModal';
import { LanguageProvider } from '@superapp/shared/language';
import { restoreCloudSession } from '@superapp/shared/cloud-auth';
import { DICTIONARIES as WEB_DICTIONARIES } from '@/lib/dictionaries';
import { initWebStorage } from '@/lib/storageAdapter';

initWebStorage();

import QuickCapture from '@/components/QuickCapture';
import AICoachPopup from '@/components/AICoachPopup';
import Topbar from '@/components/Topbar';
import MobileBottomNav from '@/components/MobileBottomNav';
import { ToastProvider } from '@/lib/toastContext';

export default function AppShell({ children }) {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Check if the user has seen the onboarding before
    const hasSeen = localStorage.getItem('has_seen_onboarding');
    if (!hasSeen) {
      setShowOnboarding(true);
    }
  }, []);

  useEffect(() => {
    // Re-establish a stored Supabase session so cloud-backed features (database
    // migration) have a live access token after a page reload.
    restoreCloudSession();
  }, []);

  const handleCloseOnboarding = () => {
    localStorage.setItem('has_seen_onboarding', 'true');
    setShowOnboarding(false);
  };

  if (pathname === '/privacy' || pathname === '/terms') {
    return <LanguageProvider dictionaries={WEB_DICTIONARIES}>{children}</LanguageProvider>;
  }

  return (
    <LanguageProvider dictionaries={WEB_DICTIONARIES}>
      <UserProvider>
        <PremiumProvider>
          <PomodoroProvider>
            <ToastProvider>
              <AuthGuard>
                <div className="app-layout">
                  <Sidebar />
                  <main className="main-content">
                    <Topbar />
                    <div className="wy-page-content">{children}</div>
                  </main>
                  <MobileBottomNav />
                  <OnboardingModal isOpen={showOnboarding} onClose={handleCloseOnboarding} />
                  <QuickCapture />
                  <AICoachPopup />
                </div>
              </AuthGuard>
            </ToastProvider>
          </PomodoroProvider>
        </PremiumProvider>
      </UserProvider>
    </LanguageProvider>
  );
}
