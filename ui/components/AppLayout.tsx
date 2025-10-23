import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  const activeView = useMemo(() => {
    const p = location.pathname;
    if (p.startsWith('/settings')) return 'settings';
    if (p.startsWith('/notifications')) return 'notifications';
    if (p.startsWith('/project')) return 'project';
    return 'dashboard';
  }, [location.pathname]);

  function handleNavigate(view: string) {
    switch (view) {
      case 'dashboard':
        navigate('/dashboard');
        break;
      case 'settings':
        navigate('/settings');
        break;
      case 'notifications':
        navigate('/notifications');
        break;
      case 'project':
        navigate(selectedProject ? `/project/${selectedProject}` : '/dashboard');
        break;
      case 'project_create':
        // For now, keep user on dashboard; creation handled within Dashboard UI
        navigate('/dashboard');
        break;
      default:
        navigate('/dashboard');
    }
  }

  function handleSelectProject(id: string) {
    setSelectedProject(id);
    navigate(`/project/${id}`);
  }

  function handleOpenCreateProject() {
    // No-op for now; dashboard handles its own picker/modal
    navigate('/dashboard');
  }

  return (
    <div className="flex h-screen bg-white dark:bg-[#0A0A0A]">
      <AppSidebar
        activeView={activeView}
        activeProject={selectedProject}
        onNavigate={handleNavigate}
        onSelectProject={handleSelectProject}
        onOpenCreateProject={handleOpenCreateProject}
      />
      <div className="flex-1 h-screen overflow-y-auto">
        {children}
      </div>
    </div>
  );
}