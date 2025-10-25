import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { getSocket, joinProjectRoom, leaveCurrentRoom } from '../lib/socket';

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
    if (p.startsWith('/projects/')) return 'project';
    return 'dashboard';
  }, [location.pathname]);

  useEffect(() => {
    // Initialize socket connection (auth handled via token in getSocket)
    getSocket();
  }, []);

  useEffect(() => {
    // Extract project id from URL
    const match = location.pathname.match(/\/projects\/(\d+)/);
    const pId = match?.[1] || null;
    setSelectedProject(pId);
    if (pId) joinProjectRoom(pId);
    else leaveCurrentRoom();
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
        navigate(selectedProject ? `/projects/${selectedProject}` : '/dashboard');
        break;
      case 'project_create':
        navigate('/dashboard');
        break;
      default:
        navigate('/dashboard');
    }
  }

  function handleSelectProject(id: string) {
    setSelectedProject(id);
    navigate(`/projects/${id}`);
  }

  function handleOpenCreateProject() {
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