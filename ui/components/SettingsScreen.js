import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, useRef } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Separator } from './ui/separator';
import { User, Bell, Palette, Users, Shield, Trash2, } from 'lucide-react';
import { useTheme } from '../lib/theme-context';
import { toast } from 'sonner';
import { getCurrentUser, getCurrentUserFromAPI, updateUser, setCurrentUser } from '../lib/api';
export function SettingsScreen() {
    const [activeSection, setActiveSection] = useState('profile');
    const [user, setUser] = useState(getCurrentUser());
    useEffect(() => {
        if (!user) {
            getCurrentUserFromAPI().then((u) => {
                if (u)
                    setUser(u);
            }).catch(() => { });
        }
    }, []);
    // Preselect section from navigation and listen for section change events
    useEffect(() => {
        try {
            const section = localStorage.getItem('settings_active_section');
            if (section) {
                setActiveSection(section);
                localStorage.removeItem('settings_active_section');
            }
        }
        catch { }
        const handler = (e) => {
            const sec = e?.detail?.section;
            if (typeof sec === 'string')
                setActiveSection(sec);
        };
        window.addEventListener('settings:open_section', handler);
        return () => window.removeEventListener('settings:open_section', handler);
    }, []);
    const sections = [
        { id: 'profile', label: 'Profile', icon: _jsx(User, { className: "w-4 h-4" }) },
        { id: 'appearance', label: 'Appearance', icon: _jsx(Palette, { className: "w-4 h-4" }) },
        { id: 'notifications', label: 'Notifications', icon: _jsx(Bell, { className: "w-4 h-4" }) },
        { id: 'team', label: 'Team', icon: _jsx(Users, { className: "w-4 h-4" }) },
        { id: 'account', label: 'Account', icon: _jsx(Shield, { className: "w-4 h-4" }) },
    ];
    return (_jsx("div", { className: "flex-1 h-screen overflow-y-auto bg-white dark:bg-[#0A0A0A]", children: _jsxs("div", { className: "p-8", children: [_jsx("h1", { className: "text-slate-900 dark:text-white mb-2", children: "Settings" }), _jsx("p", { className: "text-slate-600 dark:text-slate-400 mb-8", children: "Manage your account and workspace preferences" }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-4 gap-8", children: [_jsx("div", { className: "space-y-1", children: sections.map((section) => (_jsxs("button", { onClick: () => setActiveSection(section.id), className: `w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm ${activeSection === section.id
                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`, children: [section.icon, _jsx("span", { children: section.label })] }, section.id))) }), _jsxs("div", { className: "lg:col-span-3", children: [activeSection === 'profile' && _jsx(ProfileSection, { user: user, onUserUpdated: (u) => setUser(u) }), activeSection === 'appearance' && _jsx(AppearanceSection, {}), activeSection === 'notifications' && _jsx(NotificationsSection, {}), activeSection === 'team' && _jsx(TeamSection, {}), activeSection === 'account' && _jsx(AccountSection, {})] })] })] }) }));
}
function ProfileSection({ user, onUserUpdated }) {
    const [username, setUsername] = useState(user?.username || '');
    const [email, setEmail] = useState(user?.email || '');
    const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '');
    const fileInputRef = useRef(null);
    useEffect(() => {
        setUsername(user?.username || '');
        setEmail(user?.email || '');
        setAvatarPreview(user?.avatar || '');
    }, [user]);
    const initials = (user?.username || user?.email || 'U').slice(0, 2).toUpperCase();
    function handleAvatarClick() {
        fileInputRef.current?.click();
    }
    function handleAvatarChange(e) {
        const file = e.target.files?.[0];
        if (!file)
            return;
        const reader = new FileReader();
        reader.onload = () => {
            setAvatarPreview(reader.result);
        };
        reader.readAsDataURL(file);
    }
    async function handleSave() {
        try {
            if (!user?.id)
                throw new Error('No user loaded');
            const updated = await updateUser(Number(user.id), { username, email, avatar: avatarPreview });
            setCurrentUser(updated);
            onUserUpdated(updated);
            window.dispatchEvent(new CustomEvent('user:updated'));
            toast.success('Profile updated');
        }
        catch (e) {
            toast.error(e?.message || 'Failed to update profile');
        }
    }
    return (_jsxs(Card, { className: "bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsx("h3", { className: "text-slate-900 dark:text-white", children: "Profile" }), _jsx(Button, { onClick: handleSave, className: "bg-indigo-600 hover:bg-indigo-700 text-white", children: "Save changes" })] }), _jsxs("div", { className: "flex items-center gap-4", children: [_jsxs(Avatar, { className: "h-16 w-16", children: [_jsx(AvatarImage, { src: avatarPreview || '' }), _jsx(AvatarFallback, { className: "text-sm", children: initials })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Button, { variant: "outline", size: "sm", onClick: handleAvatarClick, children: "Change avatar" }), _jsx("input", { ref: fileInputRef, type: "file", accept: "image/*", className: "hidden", onChange: handleAvatarChange })] })] }), _jsxs("div", { className: "mt-6 grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx(Label, { children: "Username" }), _jsx(Input, { value: username, onChange: (e) => setUsername(e.target.value) })] }), _jsxs("div", { children: [_jsx(Label, { children: "Email" }), _jsx(Input, { value: email, onChange: (e) => setEmail(e.target.value) })] })] })] }));
}
function AppearanceSection() {
    const { theme, setTheme } = useTheme();
    return (_jsxs(Card, { className: "bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 p-6", children: [_jsx("h3", { className: "text-slate-900 dark:text-white mb-6", children: "Appearance" }), _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx(Label, { className: "mb-3 block", children: "Theme" }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("button", { onClick: () => setTheme('light'), className: `p-4 rounded-lg border-2 transition-colors ${theme === 'light'
                                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/30'
                                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`, children: [_jsx("div", { className: "aspect-video bg-white border border-slate-200 rounded mb-2" }), _jsx("p", { className: "text-sm text-slate-900 dark:text-white", children: "Light" })] }), _jsxs("button", { onClick: () => setTheme('dark'), className: `p-4 rounded-lg border-2 transition-colors ${theme === 'dark'
                                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/30'
                                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`, children: [_jsx("div", { className: "aspect-video bg-slate-900 border border-slate-700 rounded mb-2" }), _jsx("p", { className: "text-sm text-slate-900 dark:text-white", children: "Dark" })] })] })] }), _jsx(Separator, {}), _jsxs("div", { className: "space-y-4", children: [_jsx(SettingToggle, { label: "Compact mode", description: "Reduce spacing for a denser layout" }), _jsx(SettingToggle, { label: "Reduce motion", description: "Minimize animations and transitions" })] })] })] }));
}
function NotificationsSection() {
    return (_jsxs(Card, { className: "bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 p-6", children: [_jsx("h3", { className: "text-slate-900 dark:text-white mb-6", children: "Notifications" }), _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("h4", { className: "text-sm text-slate-900 dark:text-white mb-4", children: "Email notifications" }), _jsxs("div", { className: "space-y-4", children: [_jsx(SettingToggle, { label: "Task assignments", description: "Get notified when you're assigned to a task", defaultChecked: true }), _jsx(SettingToggle, { label: "Comments & mentions", description: "Receive updates on comments and @mentions", defaultChecked: true }), _jsx(SettingToggle, { label: "Project updates", description: "Stay informed about project changes" })] })] }), _jsx(Separator, {}), _jsxs("div", { children: [_jsx("h4", { className: "text-sm text-slate-900 dark:text-white mb-4", children: "Push notifications" }), _jsxs("div", { className: "space-y-4", children: [_jsx(SettingToggle, { label: "Desktop notifications", description: "Show notifications on your desktop", defaultChecked: true }), _jsx(SettingToggle, { label: "Sound", description: "Play a sound for new notifications" })] })] })] })] }));
}
function TeamSection() {
    const [members, setMembers] = useState([]);
    useEffect(() => {
        const u = getCurrentUser();
        if (u) {
            setMembers([u]);
        }
        else {
            getCurrentUserFromAPI().then((cu) => {
                if (cu)
                    setMembers([cu]);
            }).catch(() => { });
        }
    }, []);
    return (_jsxs(Card, { className: "bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsx("h3", { className: "text-slate-900 dark:text-white", children: "Team members" }), _jsx(Button, { size: "sm", className: "bg-indigo-600 hover:bg-indigo-700 text-white", children: "Invite member" })] }), members.length === 0 ? (_jsx("div", { className: "p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700", children: _jsx("p", { className: "text-sm text-slate-600 dark:text-slate-400", children: "No team members yet." }) })) : (_jsx("div", { className: "space-y-3", children: members.map((member, i) => (_jsxs("div", { className: "flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Avatar, { className: "h-10 w-10", children: _jsx(AvatarFallback, { className: "text-sm", children: (member.username || member.email || 'U').slice(0, 2).toUpperCase() }) }), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-slate-900 dark:text-white", children: member.username || 'You' }), _jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400", children: member.email || '' })] })] }), _jsx(Badge, { variant: "outline", className: "text-xs", children: member.role || 'Member' })] }, i))) }))] }));
}
function AccountSection() {
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs(Card, { className: "bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 p-6", children: [_jsx("h3", { className: "text-slate-900 dark:text-white mb-6", children: "Security" }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx(Label, { htmlFor: "current-password", className: "mb-2 block", children: "Current password" }), _jsx(Input, { id: "current-password", type: "password" })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "new-password", className: "mb-2 block", children: "New password" }), _jsx(Input, { id: "new-password", type: "password" })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "confirm-password", className: "mb-2 block", children: "Confirm password" }), _jsx(Input, { id: "confirm-password", type: "password" })] })] }), _jsx(Separator, { className: "my-6" }), _jsx(Button, { className: "bg-indigo-600 hover:bg-indigo-700 text-white", children: "Update password" })] }), _jsxs(Card, { className: "bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 p-6", children: [_jsx("h3", { className: "text-slate-900 dark:text-white mb-4", children: "Danger zone" }), _jsx("div", { className: "p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg", children: _jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-red-900 dark:text-red-300 mb-1", children: "Delete account" }), _jsx("p", { className: "text-xs text-red-700 dark:text-red-400", children: "Permanently delete your account and all data. This action cannot be undone." })] }), _jsxs(Button, { variant: "outline", size: "sm", className: "border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950", children: [_jsx(Trash2, { className: "w-4 h-4 mr-2" }), "Delete"] })] }) })] })] }));
}
function SettingToggle({ label, description, defaultChecked }) {
    return (_jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { className: "space-y-0.5", children: [_jsx(Label, { className: "text-sm text-slate-900 dark:text-white", children: label }), _jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400", children: description })] }), _jsx(Switch, { defaultChecked: defaultChecked })] }));
}
