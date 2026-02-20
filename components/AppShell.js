'use client';

import { UserProvider } from '@/lib/auth';
import AuthGuard from '@/components/AuthGuard';
import Sidebar from '@/components/Sidebar';
import { PomodoroProvider } from '@/lib/pomodoroContext';
import { PremiumProvider } from '@/lib/premium';

export default function AppShell({ children }) {
  return (
    <UserProvider>
      <PremiumProvider>
        <PomodoroProvider>
          <AuthGuard>
            <div className="app-layout">
              <Sidebar />
              <main className="main-content">
                {children}
              </main>
            </div>
          </AuthGuard>
        </PomodoroProvider>
      </PremiumProvider>
    </UserProvider>
  );
}
