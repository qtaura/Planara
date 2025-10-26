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
import { getToken, getCurrentUser, setToken, setCurrentUser, setRefreshToken } from '@lib/api';
import { LoginScreen } from './components/LoginScreen';
import NotificationScreen from './components/NotificationScreen';
import { SignupScreen } from './components/SignupScreen';
import { SignupProvidersScreen } from './components/SignupProvidersScreen';
import { EmailSignupScreen } from './components/EmailSignupScreen';
import { SetUsernameScreen } from './components/SetUsernameScreen';
import { EmailVerificationScreen } from './components/EmailVerificationScreen';
import { getSocket, joinProjectRoom, leaveCurrentRoom } from '@lib/socket';
import SearchView from './components/SearchView';
import { LocaleProvider } from './lib/i18n';

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

  // Initialize socket connection and stay connected across views
  useEffect(() => {
    try {
      getSocket();
    } catch {}
  }, []);

  // Join/leave project rooms based on current view
  useEffect(() => {
    if (currentView === 'project' && selectedProject) {
      joinProjectRoom(selectedProject);
    } else {
      leaveCurrentRoom();
    }
  }, [currentView, selectedProject]);

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

  // Route to verification when requested globally
  useEffect(() => {
    const handler = (e: any) => {
      const email = (e && e.detail && e.detail.email) || '';
      const needsUsername = !!(e && e.detail && e.detail.needsUsername);
      setVerificationEmail(email);
      setPostVerifyView(needsUsername ? 'signup_username' : 'dashboard');
      setCurrentView('verify' as any);
    };
    window.addEventListener('auth:verification_required', handler as any);
    window.addEventListener('auth:needs_verification', handler as any);
    return () => {
      window.removeEventListener('auth:verification_required', handler as any);
      window.removeEventListener('auth:needs_verification', handler as any);
    };
  }, []);

  // Global OAuth popup message handler
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const data: any = (e && (e as any).data) || null;
      if (!data || data.type !== 'oauth') return;

      // If server indicates verification required (dev stub), go to verification
      if (data.verificationRequired && !data.token) {
        const email = data.email || (data.user && data.user.email) || '';
        setVerificationEmail(email);
        setPostVerifyView(data.created ? ('signup_username' as ViewType) : 'dashboard');
        setCurrentView('verify' as any);
        return;
      }

      // If we have a token, persist and navigate appropriately
      if (data.token) {
        try {
          setToken(String(data.token));
          if (data.refreshToken) setRefreshToken(String(data.refreshToken));
          if (data.user) setCurrentUser(data.user);
        } catch {}
        const userVerified = !!(data.user && (data.user.isVerified || data.user.verified));
        if (!userVerified) {
          const email = (data.user && data.user.email) || '';
          setVerificationEmail(email);
          setPostVerifyView(data.created ? ('signup_username' as ViewType) : 'dashboard');
          setCurrentView('verify' as any);
          return;
        }
        setCurrentView(data.created ? 'signup_username' : 'dashboard');
      }
    };
    window.addEventListener('message', handler as any);
    return () => window.removeEventListener('message', handler as any);
  }, []);

  useEffect(() => {
    const handler = () => {
      const p = localStorage.getItem('navigate_to_project');
      if (p) {
        setSelectedProject(p);
        setCurrentView('project');
        localStorage.removeItem('navigate_to_project');
      }
    };
    window.addEventListener('projects:open', handler);
    return () => window.removeEventListener('projects:open', handler);
  }, []);

  // Keep URL in sync with view for refresh-friendly navigation
  useEffect(() => {
    const path = viewToPath(currentView);
    if (window.location.pathname !== path) {
      window.history.replaceState({}, '', path);
    }
  }, [currentView, selectedProject]);

  const handleNavigate = (view: ViewType, projectId?: string) => {
    if (view === 'project' && projectId) setSelectedProject(projectId);
    setCurrentView(view);
  };

  const viewToPath = (view: ViewType): string => {
    switch (view) {
      case 'landing':
        return '/';
      case 'login':
        return '/login';
      case 'signup':
        return '/signup';
      case 'signup_providers':
        return '/signup';
      case 'signup_email':
        return '/signup/email';
      case 'signup_username':
        return '/signup/username';
      case 'verify':
        return '/verify';
      case 'dashboard':
        return '/dashboard';
      case 'onboarding':
        return '/onboarding';
      case 'settings':
        return '/settings';
      case 'notifications':
        return '/notifications';
      case 'project':
        return selectedProject ? `/projects/${selectedProject}` : '/project';
      case 'search':
        return window.location.pathname + window.location.search;
      default:
        return '/';
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
    if (path.startsWith('/search')) return 'search';
    return 'landing';
  };

  useEffect(() => {
    const view = pathToView(window.location.pathname);
    setCurrentView(view);
    if (view === 'project') {
      const m = window.location.pathname.match(/\/(projects)\/(\d+)/);
      if (m?.[2]) setSelectedProject(m[2]);
    }
  }, []);

  const handleCreateProject = () => {
    setShowCreateProject(false);
    setCurrentView('dashboard');
  };

  const user = getCurrentUser();
  const showUnverifiedBanner =
    !!(user && !(user.isVerified || user.verified)) && currentView !== 'verify';

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
    return <OnboardingScreen onComplete={() => handleNavigate('dashboard')} />;
  }

  return (
    <div className="flex h-screen bg-white dark:bg-[#0A0A0A]">
      <AppSidebar
        activeView={currentView}
        activeProject={selectedProject}
        onNavigate={(v) => handleNavigate(v)}
        onSelectProject={(id) => handleNavigate('project', id)}
        onOpenCreateProject={() => setShowCreateProject(true)}
      />

      <div className="flex-1 h-screen overflow-y-auto">
        {showUnverifiedBanner && (
          <div className="p-3 bg-amber-100 dark:bg-amber-950/30 text-amber-800 dark:text-amber-400 text-sm text-center">
            Please verify your email address to continue using Planara.
          </div>
        )}

        {currentView === 'dashboard' && (
          <Dashboard
            onOpenCreateProject={() => setShowCreateProject(true)}
            onOpenProject={(id) => handleNavigate('project', id)}
          />
        )}

        {currentView === 'settings' && <SettingsScreen />}
        {currentView === 'notifications' && <NotificationScreen />}
        {currentView === 'project' && selectedProject && (
          <ProjectView projectId={selectedProject} />
        )}
        {currentView === 'search' && <SearchView />}
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
    <LocaleProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </LocaleProvider>
  );
}
