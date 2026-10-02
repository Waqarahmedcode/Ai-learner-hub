import { useState } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { CampaignProvider, useCampaign } from '@/lib/campaign';
import { ToastProvider } from '@/lib/toast';
import { AppShell } from '@/components/AppShell';
import { AuthScreen } from '@/screens/AuthScreen';
import { Onboarding } from '@/screens/Onboarding';
import { HomeDashboard } from '@/screens/HomeDashboard';
import { TodayScreen } from '@/screens/TodayScreen';
import { ContentStudio } from '@/screens/ContentStudio';
import { ContentLibrary } from '@/screens/ContentLibrary';
import { ContentCalendar } from '@/screens/ContentCalendar';
import { AnalyticsScreen } from '@/screens/AnalyticsScreen';
import { ReportScreen } from '@/screens/ReportScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { Loading } from '@/components/ui';
import type { ScreenKey } from '@/components/nav';

function AppInner() {
  const { session, loading, refreshProfile } = useAuth();
  const { needOnboarding, loading: campLoading, refresh } = useCampaign();
  const [screen, setScreen] = useState<ScreenKey>('home');

  if (loading || campLoading) return <div className="min-h-screen flex items-center justify-center bg-ivory-50"><Loading label="Loading…" /></div>;
  if (!session) return <AuthScreen />;
  if (needOnboarding) return <Onboarding onDone={async () => { await Promise.all([refreshProfile(), refresh()]); setScreen('home'); }} />;

  const screens: Record<ScreenKey, React.ReactNode> = {
    home: <HomeDashboard onNavigate={setScreen} />,
    today: <TodayScreen />,
    studio: <ContentStudio onNavigate={setScreen} />,
    library: <ContentLibrary />,
    calendar: <ContentCalendar />,
    analytics: <AnalyticsScreen />,
    report: <ReportScreen />,
    settings: <SettingsScreen />,
  };

  return (
    <AppShell current={screen} onNavigate={setScreen}>
      {screens[screen]}
    </AppShell>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <CampaignProvider>
          <AppInner />
        </CampaignProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
