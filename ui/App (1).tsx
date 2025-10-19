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
import { getToken } from '@lib/api';
import { LoginScreen } from './components/LoginScreen';

function AppContent() {
  const [currentView, setCurrentView] = useState<ViewType>(() => (getToken() ? 'dashboard' : 'login'));
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [showCreateProject, setShowCreateProject] = useState(false);

  useEffect(() => {
    const handler = () => setCurrentView('login');
    window.addEventListener('auth:required', handler);
    return () => window.removeEventListener('auth:required', handler);
  }, []);

  const handleNavigate = (view: ViewType) => {
    setCurrentView(view);
  };

  const handleSelectProject = (projectId: string) => {
    setSelectedProject(projectId);
  };

  const handleCreateProject = () => {
    setShowCreateProject(false);
    setCurrentView('dashboard');
  };

  if (currentView === 'login') {
    return <LoginScreen onSuccess={() => setCurrentView('dashboard')} />;
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

      <AIAssistant />

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
