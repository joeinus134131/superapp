'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { UserProvider } from '@/lib/auth';
import AuthGuard from '@/components/AuthGuard';
import Sidebar from '@/components/Sidebar';
import { PomodoroProvider } from '@/lib/pomodoroContext';
import { PremiumProvider } from '@/lib/premium';
import OnboardingModal from '@/components/OnboardingModal';
import { LanguageProvider } from '@/lib/language';

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

  const handleCloseOnboarding = () => {
    localStorage.setItem('has_seen_onboarding', 'true');
    setShowOnboarding(false);
  };

  if (pathname === '/privacy' || pathname === '/terms') {
    return <>{children}</>;
  }

  return (
    <LanguageProvider>
      <UserProvider>
        <PremiumProvider>
          <PomodoroProvider>
            <AuthGuard>
              <div className="app-layout">
                <Sidebar />
                <main className="main-content">
                  {children}
                </main>
                <OnboardingModal isOpen={showOnboarding} onClose={handleCloseOnboarding} />
              </div>
            </AuthGuard>
          </PomodoroProvider>
        </PremiumProvider>
      </UserProvider>
    </LanguageProvider>
  );
}
