import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom';
import './styles/globals.css';

import { ThemeProvider } from './lib/theme-context';
import { Toaster } from './components/ui/sonner';
import { LandingScreen } from './components/LandingScreen';
import { LoginScreen } from './components/LoginScreen';
import { SignupScreen } from './components/SignupScreen';
import { SignupProvidersScreen } from './components/SignupProvidersScreen';
import { EmailSignupScreen } from './components/EmailSignupScreen';
import { SetUsernameScreen } from './components/SetUsernameScreen';
import { Dashboard } from './components/Dashboard';
import { ProjectView } from './components/ProjectView';
import { SettingsScreen } from './components/SettingsScreen';
import { AIAssistant } from './components/AIAssistant';
import { OnboardingScreen } from './components/OnboardingScreen';
import { AppLayout } from './components/AppLayout';
import NotificationScreen from './components/NotificationScreen';

function LandingRoute() {
  const navigate = useNavigate();
  return (
    <LandingScreen
      onNavigate={(view) => {
        const map: Record<string, string> = {
          landing: '/',
          onboarding: '/onboarding',
          dashboard: '/dashboard',
          login: '/login',
          signup: '/signup',
          signup_providers: '/signup/providers',
          settings: '/settings',
        };
        navigate(map[view] || '/');
      }}
    />
  );
}

function LoginRoute() {
  const navigate = useNavigate();
  return <LoginScreen onSuccess={() => navigate('/dashboard')} />;
}

function SignupRoute() {
  const navigate = useNavigate();
  return <SignupScreen onSuccess={() => navigate('/dashboard')} />;
}

function SignupProvidersRoute() {
  const navigate = useNavigate();
  return (
    <SignupProvidersScreen
      onChooseEmail={() => navigate('/signup/email')}
      onChooseProvider={() => {}}
      onSkip={() => navigate('/')}
    />
  );
}

function EmailSignupRoute() {
  const navigate = useNavigate();
  return (
    <EmailSignupScreen
      onNext={({ email, password }) => {
        navigate('/signup/username', { state: { email, password } });
      }}
    />
  );
}

function UsernameRoute() {
  const navigate = useNavigate();
  const location = useLocation() as any;
  const email = location?.state?.email ?? '';
  const password = location?.state?.password ?? '';
  return (
    <SetUsernameScreen
      email={email}
      password={password}
      onSuccess={() => navigate('/dashboard')}
    />
  );
}

function DashboardRoute() {
  const navigate = useNavigate();
  return (
    <Dashboard
      onSelectProject={(id: string) => navigate(`/project/${id}`)}
      onNavigate={(view: string) => {
        const map: Record<string, string> = {
          dashboard: '/dashboard',
          project: '/project',
          settings: '/settings',
        };
        navigate(map[view] || '/dashboard');
      }}
    />
  );
}

function ProjectRoute() {
  const params = useParams();
  const projectId = params.id as string;
  return <ProjectView projectId={projectId} />;
}

function SettingsRoute() {
  return <SettingsScreen />;
}

function OnboardingRoute() {
  const navigate = useNavigate();
  return <OnboardingScreen onComplete={() => navigate('/dashboard')} />;
}

function NotificationRoute() {
  return <NotificationScreen />;
}

function AppRouter() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingRoute />} />
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/signup" element={<SignupRoute />} />
          <Route path="/signup/providers" element={<SignupProvidersRoute />} />
          <Route path="/signup/email" element={<EmailSignupRoute />} />
          <Route path="/signup/username" element={<UsernameRoute />} />
          <Route path="/onboarding" element={<OnboardingRoute />} />
          <Route path="/dashboard" element={<AppLayout><DashboardRoute /></AppLayout>} />
          <Route path="/project/:id" element={<AppLayout><ProjectRoute /></AppLayout>} />
          <Route path="/settings" element={<AppLayout><SettingsRoute /></AppLayout>} />
          <Route path="/notifications" element={<AppLayout><NotificationRoute /></AppLayout>} />
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <AIAssistant />
        <Toaster />
      </BrowserRouter>
    </ThemeProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>
);