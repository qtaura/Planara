import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { LayoutDashboard, Archive, Users, Bell, Settings, Plus, Search } from 'lucide-react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Input } from './ui/input';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { useEffect, useState } from 'react';
import { listProjects, getCurrentUser, getCurrentUserFromAPI } from '@lib/api';
import { toast } from 'sonner';
export function AppSidebar({ activeView, activeProject, onNavigate, onSelectProject, onOpenCreateProject }) {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(getCurrentUser());
    async function fetchProjects() {
        setLoading(true);
        setError(null);
        try {
            const ps = await listProjects();
            setProjects(ps);
        }
        catch (e) {
            setError(e?.message || 'Failed to load projects');
            toast.error(error || 'Failed to load projects');
        }
        finally {
            setLoading(false);
        }
    }
    async function refreshUser() {
        try {
            const u = getCurrentUser();
            if (u) {
                setUser(u);
                return;
            }
            const fromApi = await getCurrentUserFromAPI();
            if (fromApi)
                setUser(fromApi);
        }
        catch { }
    }
    useEffect(() => {
        let cancelled = false;
        fetchProjects().catch(() => { });
        refreshUser().catch(() => { });
        function onChanged() {
            if (!cancelled)
                fetchProjects().catch(() => { });
        }
        function onAuth() {
            if (!cancelled)
                refreshUser().catch(() => { });
        }
        window.addEventListener('projects:changed', onChanged);
        window.addEventListener('auth:logged_in', onAuth);
        window.addEventListener('user:updated', onAuth);
        return () => {
            cancelled = true;
            window.removeEventListener('projects:changed', onChanged);
            window.removeEventListener('auth:logged_in', onAuth);
            window.removeEventListener('user:updated', onAuth);
        };
    }, []);
    const activeProjects = projects.filter(p => p.status === 'active');
    const favoriteProjects = activeProjects.filter(p => p.favorite);
    const initials = (user?.username || user?.email || 'U').slice(0, 2).toUpperCase();
    return (_jsxs("div", { className: "w-64 h-screen bg-white dark:bg-[#0A0A0A] border-r border-slate-200 dark:border-slate-800/50 flex flex-col", children: [_jsxs("div", { className: "p-4 border-b border-slate-200 dark:border-slate-800/50", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx(Logo, { size: "sm" }), _jsx(ThemeToggle, {})] }), _jsxs("button", { className: "flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 w-full transition-colors", onClick: () => { try {
                            localStorage.setItem('settings_active_section', 'profile');
                        }
                        catch { } ; onNavigate('settings'); }, children: [_jsxs(Avatar, { className: "h-6 w-6", children: [_jsx(AvatarImage, { src: user?.avatar || '' }), _jsx(AvatarFallback, { className: "text-xs", children: initials })] }), _jsx("div", { className: "flex-1 min-w-0 text-left", children: _jsx("p", { className: "text-sm text-slate-900 dark:text-white truncate", children: user?.username || 'You' }) })] }), loading && (_jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400 mt-2", children: "Refreshing projects..." })), error && (_jsx("p", { className: "text-xs text-red-600 dark:text-red-400 mt-1", children: error }))] }), _jsx("div", { className: "p-3 border-b border-slate-200 dark:border-slate-800/50", children: _jsxs("div", { className: "relative", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" }), _jsx(Input, { placeholder: "Search...", className: "pl-9 h-9 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700/50 text-sm" })] }) }), _jsxs("div", { className: "flex-1 overflow-y-auto py-3", children: [_jsxs("div", { className: "px-3 space-y-0.5 mb-4", children: [_jsx(NavItem, { icon: _jsx(LayoutDashboard, { className: "w-4 h-4" }), label: "Dashboard", active: activeView === 'dashboard', onClick: () => { try {
                                    localStorage.setItem('dashboard_filter', 'active');
                                }
                                catch { } ; onNavigate('dashboard'); } }), _jsx(NavItem, { icon: _jsx(Bell, { className: "w-4 h-4" }), label: "Notifications", badge: "3", onClick: () => { try {
                                    localStorage.setItem('settings_active_section', 'notifications');
                                }
                                catch { } ; onNavigate('settings'); } }), _jsx(NavItem, { icon: _jsx(Users, { className: "w-4 h-4" }), label: "Team", onClick: () => { try {
                                    localStorage.setItem('settings_active_section', 'team');
                                }
                                catch { } ; onNavigate('settings'); } })] }), favoriteProjects.length > 0 && (_jsxs("div", { className: "px-3 mb-4", children: [_jsx("div", { className: "flex items-center justify-between px-2 mb-1", children: _jsx("span", { className: "text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider", children: "Favorites" }) }), _jsx("div", { className: "space-y-0.5", children: favoriteProjects.map((project) => (_jsx(ProjectItem, { project: project, active: activeProject === project.id, onClick: () => {
                                        onSelectProject(project.id);
                                        onNavigate('project');
                                    } }, project.id))) })] })), _jsxs("div", { className: "px-3", children: [_jsxs("div", { className: "flex items-center justify-between px-2 mb-1", children: [_jsx("span", { className: "text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider", children: "Projects" }), _jsx(Button, { variant: "ghost", size: "sm", className: "h-5 w-5 p-0 hover:bg-slate-100 dark:hover:bg-slate-800", onClick: onOpenCreateProject, children: _jsx(Plus, { className: "w-3 h-3" }) })] }), _jsx("div", { className: "space-y-0.5", children: activeProjects.length === 0 ? (_jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400 px-2 py-1.5", children: "No projects yet" })) : (activeProjects.map((project) => (_jsx(ProjectItem, { project: project, active: activeProject === project.id, onClick: () => {
                                        onSelectProject(project.id);
                                        onNavigate('project');
                                    } }, project.id)))) })] }), _jsx("div", { className: "px-3 mt-4 space-y-0.5", children: _jsx(NavItem, { icon: _jsx(Archive, { className: "w-4 h-4" }), label: "Archived", onClick: () => { try {
                                localStorage.setItem('dashboard_filter', 'archived');
                            }
                            catch { } ; onNavigate('dashboard'); } }) })] }), _jsx("div", { className: "p-3 border-t border-slate-200 dark:border-slate-800/50", children: _jsx(NavItem, { icon: _jsx(Settings, { className: "w-4 h-4" }), label: "Settings", active: activeView === 'settings', onClick: () => onNavigate('settings') }) })] }));
}
function NavItem({ icon, label, active, badge, onClick }) {
    return (_jsxs("button", { onClick: onClick, className: `w-full flex items-center gap-3 px-2 py-1.5 rounded-md transition-colors text-sm ${active
            ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'}`, children: [icon, _jsx("span", { className: "flex-1 text-left", children: label }), badge && (_jsx("span", { className: "text-xs bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded", children: badge }))] }));
}
function ProjectItem({ project, active, onClick }) {
    return (_jsxs("button", { onClick: onClick, className: `w-full flex items-center gap-3 px-2 py-1.5 rounded-md transition-colors text-sm ${active
            ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'}`, children: [_jsx("div", { className: "w-2 h-2 rounded-sm flex-shrink-0", style: { backgroundColor: project.color } }), _jsx("span", { className: "flex-1 text-left truncate", children: project.name }), project.githubLinked && (_jsx("div", { className: "w-1.5 h-1.5 rounded-full bg-green-500" }))] }));
}
