import { useState } from 'react';
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

function AppContent() {
  const [currentView, setCurrentView] = useState<ViewType>('landing');
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [showCreateProject, setShowCreateProject] = useState(false);

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
