import { useEffect, useState, useRef } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Separator } from './ui/separator';
import {
  User,
  Bell,
  Palette,
  Users,
  Shield,
  Github,
  Mail,
  Trash2,
} from 'lucide-react';
import { useTheme } from '../lib/theme-context';
import { toast } from 'sonner';
import { getCurrentUser, getCurrentUserFromAPI, updateUser, setCurrentUser } from '../lib/api';

export function SettingsScreen() {
  const [activeSection, setActiveSection] = useState('profile');
  const [user, setUser] = useState<any | null>(getCurrentUser());

  useEffect(() => {
    if (!user) {
      getCurrentUserFromAPI().then((u) => {
        if (u) setUser(u);
      }).catch(() => {});
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
    } catch {}
    const handler = (e: any) => {
      const sec = e?.detail?.section;
      if (typeof sec === 'string') setActiveSection(sec);
    };
    window.addEventListener('settings:open_section', handler as EventListener);
    return () => window.removeEventListener('settings:open_section', handler as EventListener);
  }, []);

  const sections = [
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
    { id: 'team', label: 'Team', icon: <Users className="w-4 h-4" /> },
    { id: 'account', label: 'Account', icon: <Shield className="w-4 h-4" /> },
  ];

  return (
    <div className="flex-1 h-screen overflow-y-auto bg-white dark:bg-[#0A0A0A]">
      <div className="p-8">
        <h1 className="text-slate-900 dark:text-white mb-2">Settings</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-8">
          Manage your account and workspace preferences
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm ${
                  activeSection === section.id
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                {section.icon}
                <span>{section.label}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            {activeSection === 'profile' && <ProfileSection user={user} onUserUpdated={(u) => setUser(u)} />}
            {activeSection === 'appearance' && <AppearanceSection />}
            {activeSection === 'notifications' && <NotificationsSection />}
            {activeSection === 'team' && <TeamSection />}
            {activeSection === 'account' && <AccountSection />}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileSection({ user, onUserUpdated }: { user: any | null; onUserUpdated: (u: any) => void; }) {
  const [username, setUsername] = useState<string>(user?.username || '');
  const [email, setEmail] = useState<string>(user?.email || '');
  const [avatarPreview, setAvatarPreview] = useState<string>(user?.avatar || '');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setUsername(user?.username || '');
    setEmail(user?.email || '');
    setAvatarPreview(user?.avatar || '');
  }, [user]);

  const initials = (user?.username || user?.email || 'U').slice(0, 2).toUpperCase();

  function handleAvatarClick() {
    fileInputRef.current?.click();
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    try {
      if (!user?.id) throw new Error('No user loaded');
      const updated = await updateUser(Number(user.id), { username, email, avatar: avatarPreview });
      setCurrentUser(updated);
      onUserUpdated(updated);
      window.dispatchEvent(new CustomEvent('user:updated'));
      toast.success('Profile updated');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update profile');
    }
  }

  return (
    <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-slate-900 dark:text-white">Profile</h3>
        <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white">Save changes</Button>
      </div>
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={avatarPreview || ''} />
          <AvatarFallback className="text-sm">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleAvatarClick}>Change avatar</Button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Username</Label>
          <Input value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div>
          <Label>Email</Label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>
    </Card>
  );
}

function AppearanceSection() {
  const { theme, setTheme } = useTheme();

  return (
    <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 p-6">
      <h3 className="text-slate-900 dark:text-white mb-6">Appearance</h3>

      <div className="space-y-6">
        <div>
          <Label className="mb-3 block">Theme</Label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setTheme('light')}
              className={`p-4 rounded-lg border-2 transition-colors ${
                theme === 'light'
                  ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/30'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <div className="aspect-video bg-white border border-slate-200 rounded mb-2" />
              <p className="text-sm text-slate-900 dark:text-white">Light</p>
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`p-4 rounded-lg border-2 transition-colors ${
                theme === 'dark'
                  ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/30'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <div className="aspect-video bg-slate-900 border border-slate-700 rounded mb-2" />
              <p className="text-sm text-slate-900 dark:text-white">Dark</p>
            </button>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <SettingToggle
            label="Compact mode"
            description="Reduce spacing for a denser layout"
          />
          <SettingToggle
            label="Reduce motion"
            description="Minimize animations and transitions"
          />
        </div>
      </div>
    </Card>
  );
}

function NotificationsSection() {
  return (
    <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 p-6">
      <h3 className="text-slate-900 dark:text-white mb-6">Notifications</h3>

      <div className="space-y-6">
        <div>
          <h4 className="text-sm text-slate-900 dark:text-white mb-4">Email notifications</h4>
          <div className="space-y-4">
            <SettingToggle
              label="Task assignments"
              description="Get notified when you're assigned to a task"
              defaultChecked
            />
            <SettingToggle
              label="Comments & mentions"
              description="Receive updates on comments and @mentions"
              defaultChecked
            />
            <SettingToggle
              label="Project updates"
              description="Stay informed about project changes"
            />
          </div>
        </div>

        <Separator />

        <div>
          <h4 className="text-sm text-slate-900 dark:text-white mb-4">Push notifications</h4>
          <div className="space-y-4">
            <SettingToggle
              label="Desktop notifications"
              description="Show notifications on your desktop"
              defaultChecked
            />
            <SettingToggle
              label="Sound"
              description="Play a sound for new notifications"
            />
          </div>
        </div>
      </div>
    </Card>
  );
}

function TeamSection() {
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    const u = getCurrentUser();
    if (u) {
      setMembers([u]);
    } else {
      getCurrentUserFromAPI().then((cu) => {
        if (cu) setMembers([cu]);
      }).catch(() => {});
    }
  }, []);

  return (
    <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-slate-900 dark:text-white">Team members</h3>
        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
          Invite member
        </Button>
      </div>

      {members.length === 0 ? (
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-600 dark:text-slate-400">No team members yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {members.map((member, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="text-sm">
                    {(member.username || member.email || 'U').slice(0,2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm text-slate-900 dark:text-white">{member.username || 'You'}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{member.email || ''}</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs">
                {member.role || 'Member'}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function AccountSection() {
  return (
    <div className="space-y-6">
      <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 p-6">
        <h3 className="text-slate-900 dark:text-white mb-6">Security</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="current-password" className="mb-2 block">Current password</Label>
            <Input id="current-password" type="password" />
          </div>
          <div>
            <Label htmlFor="new-password" className="mb-2 block">New password</Label>
            <Input id="new-password" type="password" />
          </div>
          <div>
            <Label htmlFor="confirm-password" className="mb-2 block">Confirm password</Label>
            <Input id="confirm-password" type="password" />
          </div>
        </div>
        <Separator className="my-6" />
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
          Update password
        </Button>
      </Card>

      <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 p-6">
        <h3 className="text-slate-900 dark:text-white mb-4">Danger zone</h3>
        <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-red-900 dark:text-red-300 mb-1">Delete account</p>
              <p className="text-xs text-red-700 dark:text-red-400">
                Permanently delete your account and all data. This action cannot be undone.
              </p>
            </div>
            <Button variant="outline" size="sm" className="border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

interface SettingToggleProps {
  label: string;
  description: string;
  defaultChecked?: boolean;
}

function SettingToggle({ label, description, defaultChecked }: SettingToggleProps) {
  return (
    <div className="flex items-start justify-between">
      <div className="space-y-0.5">
        <Label className="text-sm text-slate-900 dark:text-white">{label}</Label>
        <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}
