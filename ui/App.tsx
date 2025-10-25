import { useEffect, useState } from 'react';
import { LandingScreen } from './components/LandingScreen';
import { OnboardingScreen } from './components/OnboardingScreen';
import { Dashboard } from './components/Dashboard';
import { ProjectView } from './components/ProjectView';
import { SettingsScreen } from './components/SettingsScreen';
import { AppSidebar } from './components/AppSidebar';
import { AIAssistant } from './components/AIAssistant';
import { CreateProjectModal } from './components/CreateProjectModal';
import { Toaster } from './components/ui/sonner';
import { ThemeProvider } from './lib/theme-context';
import { ViewType } from './types';
import { getToken, getCurrentUser } from '@lib/api';
import { LoginScreen } from './components/LoginScreen';
import NotificationScreen from './components/NotificationScreen';
import { SignupScreen } from './components/SignupScreen';
import { SignupProvidersScreen } from './components/SignupProvidersScreen';
import { EmailSignupScreen } from './components/EmailSignupScreen';
import { SetUsernameScreen } from './components/SetUsernameScreen';
import { EmailVerificationScreen } from './components/EmailVerificationScreen';

function AppContent() {
  const [currentView, setCurrentView] = useState<ViewType>('landing');
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [showCreateProject, setShowCreateProject] = useState(false);

  // signup flow state
  const [signupEmail, setSignupEmail] = useState<string>('');
  const [signupPassword, setSignupPassword] = useState<string>('');
  const [verificationEmail, setVerificationEmail] = useState<string>('');
  const [postVerifyView, setPostVerifyView] = useState<ViewType>('dashboard');

  useEffect(() => {
    const handler = () => setCurrentView('login');
    window.addEventListener('auth:required', handler);
    return () => window.removeEventListener('auth:required', handler);
  }, []);

  // Navigate after auth completes
  useEffect(() => {
    const handler = () => setCurrentView('dashboard');
    window.addEventListener('auth:logged_in', handler);
    return () => window.removeEventListener('auth:logged_in', handler);
  }, []);

  // New OAuth users need to pick a username
  useEffect(() => {
    const handler = () => setCurrentView('signup_username');
    window.addEventListener('auth:needs_username', handler);
    return () => window.removeEventListener('auth:needs_username', handler);
  }, []);

  useEffect(() => {
    const goVerify = (e: Event) => {
      const detail: any = (e as CustomEvent).detail || {};
      if (detail?.email) setVerificationEmail(detail.email);
      const needsUsername = !!detail?.needsUsername || !!detail?.created;
      setPostVerifyView(needsUsername ? 'signup_username' : 'dashboard');
      try {
        const user = getCurrentUser();
        if (user && (user.isVerified || user.verified)) {
          // Already verified; skip verification UI
          setCurrentView(needsUsername ? 'signup_username' : 'dashboard');
          return;
        }
      } catch {}
      setCurrentView('verify' as any);
    };
    window.addEventListener('auth:verification_required', goVerify as any);
    window.addEventListener('auth:needs_verification', goVerify as any);
    return () => {
      window.removeEventListener('auth:verification_required', goVerify as any);
      window.removeEventListener('auth:needs_verification', goVerify as any);
    };
  }, []);

  const viewToPath = (view: ViewType): string => {
    switch (view) {
      case 'landing': return '/';
      case 'login': return '/login';
      case 'signup': return '/signup';
      case 'signup_providers': return '/signup';
      case 'signup_email': return '/signup/email';
      case 'signup_username': return '/signup/username';
      case 'verify': return '/verify';
      case 'dashboard': return '/dashboard';
      case 'onboarding': return '/onboarding';
      case 'settings': return '/settings';
      case 'notifications': return '/notifications';
      case 'project': return selectedProject ? `/projects/${selectedProject}` : '/project';
      default: return '/';
    }
  };

  const pathToView = (path: string): ViewType => {
    if (path.startsWith('/signup/username')) return 'signup_username';
    if (path.startsWith('/signup/email')) return 'signup_email';
    if (path.startsWith('/signup')) return 'signup_providers';
    if (path.startsWith('/login')) return 'login';
    if (path.startsWith('/verify')) return 'verify' as any;
    if (path.startsWith('/dashboard')) return 'dashboard';
    if (path.startsWith('/onboarding')) return 'onboarding';
    if (path.startsWith('/settings')) return 'settings';
    if (path.startsWith('/notifications')) return 'notifications';
    if (path.startsWith('/projects/')) return 'project';
    return 'landing';
  };

  useEffect(() => {
    // Initialize view from current path and listen to browser navigation
    setCurrentView(pathToView(window.location.pathname));
    const onPop = () => setCurrentView(pathToView(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const handleNavigate = (view: ViewType) => {
    const path = viewToPath(view);
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setCurrentView(view);
  };

  const handleSelectProject = (projectId: string) => {
    setSelectedProject(projectId);
  };

  const handleCreateProject = () => {
    setShowCreateProject(false);
    setCurrentView('dashboard');
  };

  const user = getCurrentUser();
  const showUnverifiedBanner = !!(user && !(user.isVerified || user.verified)) && currentView !== 'verify';

  if (currentView === 'login') {
    return <LoginScreen onSuccess={() => setCurrentView('dashboard')} />;
  }

  if (currentView === 'signup') {
    return <SignupScreen onSuccess={() => setCurrentView('dashboard')} />;
  }

  if (currentView === 'signup_providers') {
    return (
      <SignupProvidersScreen
        onChooseEmail={() => setCurrentView('signup_email')}
        onChooseProvider={() => {}}
        onSkip={() => setCurrentView('landing')}
      />
    );
  }

  if (currentView === 'signup_email') {
    return (
      <EmailSignupScreen
        onNext={({ email, password }) => {
          setSignupEmail(email);
          setSignupPassword(password);
          setVerificationEmail(email);
          setPostVerifyView('signup_username');
          setCurrentView('verify' as any);
        }}
      />
    );
  }

  if (currentView === 'signup_username') {
    return (
      <SetUsernameScreen
        email={signupEmail}
        password={signupPassword}
        onSuccess={() => setCurrentView('dashboard')}
      />
    );
  }

  if (currentView === 'landing') {
    return <LandingScreen onNavigate={handleNavigate} />;
  }

  if (currentView === 'onboarding') {
    return (
      <OnboardingScreen
        onComplete={() => handleNavigate('dashboard')}
      />
    );
  }

  return (
    <div className="flex h-screen bg-white dark:bg-[#0A0A0A]">
      <AppSidebar
        activeView={currentView}
        activeProject={selectedProject}
        onNavigate={handleNavigate}
        onSelectProject={handleSelectProject}
        onOpenCreateProject={() => setShowCreateProject(true)}
      />

      <div className="flex-1 relative overflow-auto">
        {showUnverifiedBanner && user?.email && (
          <div className="sticky top-0 z-20 bg-amber-50 dark:bg-amber-900/40 border-b border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 px-4 py-2 flex items-center justify-between">
            <span className="text-sm">Your email is not verified. Some features are disabled.</span>
            <button
              className="text-sm font-medium underline"
              onClick={() => {
                setVerificationEmail(user.email);
                setPostVerifyView(currentView);
                setCurrentView('verify' as any);
              }}
            >
              Verify now
            </button>
          </div>
        )}

        {currentView === 'dashboard' && (
          <Dashboard
            onSelectProject={handleSelectProject}
            onNavigate={handleNavigate}
            onOpenCreateProject={() => setShowCreateProject(true)}
          />
        )}

        {currentView === 'project' && selectedProject && (
          <ProjectView projectId={selectedProject} />
        )}

        {currentView === 'settings' && <SettingsScreen />}
        {currentView === 'notifications' && <NotificationScreen />}
        {currentView === 'verify' && (
          <EmailVerificationScreen
            email={verificationEmail}
            onVerified={() => setCurrentView(postVerifyView)}
            onCancel={() => setCurrentView('dashboard')}
          />
        )}

        <AIAssistant />
      </div>

      <CreateProjectModal
        isOpen={showCreateProject}
        onClose={() => setShowCreateProject(false)}
        onCreate={handleCreateProject}
      />

      <Toaster />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
