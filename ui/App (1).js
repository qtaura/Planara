import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
import { LoginScreen } from './components/LoginScreen';
import { SignupScreen } from './components/SignupScreen';
import { SignupProvidersScreen } from './components/SignupProvidersScreen';
import { EmailSignupScreen } from './components/EmailSignupScreen';
import { SetUsernameScreen } from './components/SetUsernameScreen';
function AppContent() {
    const [currentView, setCurrentView] = useState('landing');
    const [selectedProject, setSelectedProject] = useState(null);
    const [showCreateProject, setShowCreateProject] = useState(false);
    // signup flow state
    const [signupEmail, setSignupEmail] = useState('');
    const [signupPassword, setSignupPassword] = useState('');
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
    const handleNavigate = (view) => {
        setCurrentView(view);
    };
    const handleSelectProject = (projectId) => {
        setSelectedProject(projectId);
    };
    const handleCreateProject = () => {
        setShowCreateProject(false);
        setCurrentView('dashboard');
    };
    if (currentView === 'login') {
        return _jsx(LoginScreen, { onSuccess: () => setCurrentView('dashboard') });
    }
    if (currentView === 'signup') {
        return _jsx(SignupScreen, { onSuccess: () => setCurrentView('dashboard') });
    }
    if (currentView === 'signup_providers') {
        return (_jsx(SignupProvidersScreen, { onChooseEmail: () => setCurrentView('signup_email'), onChooseProvider: () => { }, onSkip: () => setCurrentView('landing') }));
    }
    if (currentView === 'signup_email') {
        return (_jsx(EmailSignupScreen, { onNext: ({ email, password }) => {
                setSignupEmail(email);
                setSignupPassword(password);
                setCurrentView('signup_username');
            } }));
    }
    if (currentView === 'signup_username') {
        return (_jsx(SetUsernameScreen, { email: signupEmail, password: signupPassword, onSuccess: () => setCurrentView('dashboard') }));
    }
    if (currentView === 'landing') {
        return _jsx(LandingScreen, { onNavigate: handleNavigate });
    }
    if (currentView === 'onboarding') {
        return (_jsx(OnboardingScreen, { onComplete: () => handleNavigate('dashboard') }));
    }
    return (_jsxs("div", { className: "flex h-screen bg-white dark:bg-[#0A0A0A]", children: [_jsx(AppSidebar, { activeView: currentView, activeProject: selectedProject, onNavigate: handleNavigate, onSelectProject: handleSelectProject, onOpenCreateProject: () => setShowCreateProject(true) }), currentView === 'dashboard' && (_jsx(Dashboard, { onSelectProject: handleSelectProject, onNavigate: handleNavigate, onOpenCreateProject: () => setShowCreateProject(true) })), currentView === 'project' && selectedProject && (_jsx(ProjectView, { projectId: selectedProject })), currentView === 'settings' && _jsx(SettingsScreen, {}), _jsx(AIAssistant, {}), _jsx(CreateProjectModal, { isOpen: showCreateProject, onClose: () => setShowCreateProject(false), onCreate: handleCreateProject }), _jsx(Toaster, {})] }));
}
export default function App() {
    return (_jsx(ThemeProvider, { children: _jsx(AppContent, {}) }));
}
