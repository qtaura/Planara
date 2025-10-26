import { useEffect, useState, useRef, useMemo } from 'react';
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
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from './ui/alert-dialog';
import { getCurrentUser, getCurrentUserFromAPI, updateUser, getNotifications, getUnreadNotificationCount, adminUnlock, getLockoutState, getSecurityEvents, getRotationHistory, adminBanUser, adminSetUsername, setAdminTokenSession, getAdminTokenSession, inviteToTeam, getOrganizations, createOrganization, updateOrganization, deleteOrganization, transferOrgOwnership, listTeams, createTeam, listMembers, changeRole, transferTeamOwnership, leaveTeam, getSessions, revokeSession, renameSession, revokeOtherSessions } from '../lib/api';

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
    { id: 'organizations', label: 'Organizations', icon: <Users className="w-4 h-4" /> },
    { id: 'team', label: 'Team', icon: <Users className="w-4 h-4" /> },
    { id: 'security', label: 'Security', icon: <Shield className="w-4 h-4" /> },
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
            {activeSection === 'organizations' && <OrganizationSection />}
            {activeSection === 'team' && <TeamSection />}
            {activeSection === 'security' && <SecuritySection />}
            {activeSection === 'account' && <AccountSection />}
            {/* Admin controls available only to planara account */}
            {user?.email === 'hello@planara.org' && (
              <div className="mt-8">
                <AdminSection />
              </div>
            )}
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

function OrganizationSection() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [editing, setEditing] = useState<Record<number, string>>({});
  const [transfers, setTransfers] = useState<Record<number, string>>({});

  useEffect(() => { loadOrgs(); }, []);

  async function loadOrgs() {
    setLoading(true);
    try {
      const list = await getOrganizations();
      setOrgs(Array.isArray(list) ? list : []);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load organizations');
    } finally { setLoading(false); }
  }

  async function handleCreate() {
    const name = newOrgName.trim();
    if (!name) { toast.error('Enter organization name'); return; }
    try {
      await createOrganization(name);
      toast.success('Organization created');
      setNewOrgName('');
      await loadOrgs();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create organization');
    }
  }

  async function handleUpdate(id: number) {
    const name = (editing[id] || '').trim();
    if (!name) { toast.error('Enter a name'); return; }
    try {
      await updateOrganization(id, name);
      toast.success('Organization updated');
      await loadOrgs();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update organization');
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteOrganization(id);
      toast.success('Organization deleted');
      await loadOrgs();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete organization');
    }
  }

  async function handleTransfer(id: number) {
    const newOwnerUserId = Number(transfers[id] || '');
    if (!newOwnerUserId) { toast.error('Enter new owner userId'); return; }
    try {
      await transferOrgOwnership(id, newOwnerUserId);
      toast.success('Ownership transferred');
      setTransfers((s) => ({ ...s, [id]: '' }));
      await loadOrgs();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to transfer ownership');
    }
  }

  return (
    <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 p-6">
      <h3 className="text-slate-900 dark:text-white mb-4">Organizations</h3>
      <div className="mb-6 flex gap-2">
        <Input placeholder="New organization name" value={newOrgName} onChange={(e) => setNewOrgName(e.target.value)} />
        <Button onClick={handleCreate} disabled={loading || !newOrgName.trim()} className="bg-indigo-600 text-white">Create</Button>
      </div>
      {orgs.length === 0 ? (
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-600 dark:text-slate-400">No organizations yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orgs.map((org: any) => (
            <div key={org.id} className="rounded-md border border-slate-200 dark:border-slate-800 p-4">
              <div className="flex items-center gap-3">
                <Input className="flex-1" value={editing[org.id] ?? org.name} onChange={(e) => setEditing((s) => ({ ...s, [org.id]: e.target.value }))} />
                <Button variant="outline" onClick={() => handleUpdate(org.id)}>Update</Button>
                <Button variant="destructive" onClick={() => handleDelete(org.id)}><Trash2 className="w-4 h-4 mr-1" />Delete</Button>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Input placeholder="New owner userId" value={transfers[org.id] ?? ''} onChange={(e) => setTransfers((s) => ({ ...s, [org.id]: e.target.value }))} />
                <Button variant="outline" onClick={() => handleTransfer(org.id)}>Transfer ownership</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function TeamSection() {
  const [members, setMembers] = useState<any[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [sending, setSending] = useState(false);

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

  async function handleSendInvite() {
    const value = String(identifier || '').trim();
    if (!value) {
      toast.error('Please enter a username or email');
      return;
    }
    setSending(true);
    try {
      await inviteToTeam(value);
      toast.success('Invite sent successfully');
      setInviteOpen(false);
      setIdentifier('');
    } catch (e: any) {
      const msg = e?.message || 'Failed to send invite';
      toast.error(msg);
    } finally {
      setSending(false);
    }
  }

  return (
    <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-slate-900 dark:text-white">Team members</h3>
        <AlertDialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <AlertDialogTrigger asChild>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
              Invite member
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Invite to Team</AlertDialogTitle>
              <AlertDialogDescription>
                Type a username or email to send a team invite.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2">
              <Label htmlFor="invite-identifier">Username or Email</Label>
              <Input
                id="invite-identifier"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. alice or alice@example.com"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={sending}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleSendInvite} disabled={sending || !identifier.trim()}>
                {sending ? 'Sending…' : 'Send Invite'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
                  <AvatarFallback className="text-sm">{String((member?.username || member?.email || 'U')).slice(0,2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-slate-900 dark:text-white">{member?.username || member?.email}</div>
                  {member?.email && (
                    <div className="text-slate-600 dark:text-slate-400 text-xs">{member.email}</div>
                  )}
                </div>
              </div>
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

function AdminSection() {
  const [adminToken, setAdminToken] = useState('');
  const [targetEmail, setTargetEmail] = useState('');
  const [lockoutState, setLockoutState] = useState<any | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [rotations, setRotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [ipFilter, setIpFilter] = useState<string>('');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [limit, setLimit] = useState<number>(50);
  const [banReason, setBanReason] = useState<string>('');
  const [newUsername, setNewUsername] = useState<string>('');

  const fileCounts = useMemo(() => {
    const counts: Record<string, number> = {
      file_uploaded: 0,
      file_deleted: 0,
      file_previewed: 0,
      file_upload_failed: 0,
      file_version_rolled_back: 0,
    };
    for (const ev of events || []) {
      const t = ev?.eventType;
      if (t && t in counts) counts[t] += 1;
    }
    return counts;
  }, [events]);

  const hasPrereqs = Boolean(adminToken && targetEmail);
  const disabledReason = !adminToken
    ? 'Enter your Admin Token to enable actions.'
    : !targetEmail
    ? 'Enter a Target Email to enable actions.'
    : null;

  useEffect(() => {
    try {
      const t = getAdminTokenSession();
      if (t) setAdminToken(t);
    } catch {}
  }, []);
  useEffect(() => {
    try { if (adminToken) setAdminTokenSession(adminToken); } catch {}
  }, [adminToken]);

  async function fetchLockout() {
    setLoading(true); setError(null); setMessage(null);
    try {
      const state = await getLockoutState(targetEmail.trim(), adminToken.trim());
      setLockoutState(state || null);
      setMessage('Fetched lockout state');
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch lockout state');
    } finally { setLoading(false); }
  }

  async function fetchEvents() {
    setLoading(true); setError(null); setMessage(null);
    try {
      const list = await getSecurityEvents(targetEmail.trim(), adminToken.trim(), {
        type: typeFilter || undefined,
        ip: ipFilter || undefined,
        from: from || undefined,
        to: to || undefined,
        limit: limit || undefined,
      });
      setEvents(Array.isArray(list) ? list : []);
      setMessage('Fetched recent events');
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch events');
    } finally { setLoading(false); }
  }

  async function fetchRotationHistory() {
    setLoading(true); setError(null); setMessage(null);
    try {
      const list = await getRotationHistory(targetEmail.trim(), adminToken.trim(), {
        from: from || undefined,
        to: to || undefined,
        limit: limit || undefined,
      });
      setRotations(Array.isArray(list) ? list : []);
      setMessage('Fetched rotation history');
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch rotation history');
    } finally { setLoading(false); }
  }

  async function doUnlock() {
    setLoading(true); setError(null); setMessage(null);
    try {
      await adminUnlock(targetEmail.trim(), adminToken.trim());
      setMessage('Account unlocked');
    } catch (e: any) {
      setError(e?.message || 'Failed to unlock');
    } finally { setLoading(false); }
  }

  async function doBan() {
    setLoading(true); setError(null); setMessage(null);
    try {
      const ok = window.confirm(
        `Ban this user and purge their account?\n\nTarget: ${targetEmail}\nReason: ${banReason || 'None provided'}\n\nThis action cannot be undone.`
      );
      if (!ok) { setLoading(false); return; }
      await adminBanUser(targetEmail.trim(), adminToken.trim(), banReason || undefined);
      setMessage('User banned and account purged (email remains banned)');
      setLockoutState(null);
      setEvents([]);
      setRotations([]);
    } catch (e: any) {
      setError(e?.message || 'Failed to ban user');
    } finally { setLoading(false); }
  }

  async function doChangeUsername() {
    setLoading(true); setError(null); setMessage(null);
    try {
      if (!newUsername.trim()) throw new Error('New username required');
      const ok = window.confirm(
        `Change username for ${targetEmail}?\n\nNew username: ${newUsername.trim()}\n\nProceed?`
      );
      if (!ok) { setLoading(false); return; }
      await adminSetUsername(targetEmail.trim(), newUsername.trim(), adminToken.trim());
      setMessage('Username updated');
    } catch (e: any) {
      setError(e?.message || 'Failed to change username');
    } finally { setLoading(false); }
  }

  return (
    <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 p-6">
      <h3 className="text-slate-900 dark:text-white mb-2">Admin Controls</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">Restricted to planara account (hello@planara.org). Requires admin token.</p>

      <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 p-4 mb-6">
        <p className="text-sm font-medium mb-2">Quick Guide</p>
        <ol className="text-sm list-decimal pl-5 space-y-1 text-slate-700 dark:text-slate-300">
          <li>Step 1: Paste your Admin Token.</li>
          <li>Step 2: Enter the user’s email.</li>
          <li>Step 3: Inspect events or lockout state.</li>
          <li>Step 4: Perform Account Actions (Unlock, Ban, Change Username).</li>
        </ol>
        <p className="text-xs mt-2 text-slate-600 dark:text-slate-400">Banning removes the account and blocks future signups for that email. All actions are logged to security events.</p>
      </div>

      <h4 className="text-sm text-slate-900 dark:text-white mb-2">Step 1 — Admin Token</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="mb-1 block">Admin Token</Label>
          <Input type="password" value={adminToken} onChange={(e) => setAdminToken(e.target.value)} placeholder="Paste admin token here" />
          <p className="text-xs mt-1 text-slate-600 dark:text-slate-400">Ask a senior admin for the token. Keep it secret.</p>
        </div>
        <div>
          <Label className="mb-1 block">Target Email</Label>
          <Input type="email" value={targetEmail} onChange={(e) => setTargetEmail(e.target.value)} placeholder="user@example.com" />
          <p className="text-xs mt-1 text-slate-600 dark:text-slate-400">Enter the exact email of the user you want to manage.</p>
        </div>
      </div>

      <Separator className="my-6" />

      <h4 className="text-sm text-slate-900 dark:text-white mb-3">Step 2 — Filters (optional)</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label className="mb-1 block">Event Type</Label>
          <Input value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} placeholder="login_failed, verify_failed" />
          <p className="text-xs mt-1 text-slate-600 dark:text-slate-400">Leave empty to see all event types.</p>
        </div>
        <div>
          <Label className="mb-1 block">IP Filter</Label>
          <Input value={ipFilter} onChange={(e) => setIpFilter(e.target.value)} placeholder="203.0.113.5" />
          <p className="text-xs mt-1 text-slate-600 dark:text-slate-400">Limit results to a specific IP address.</p>
        </div>
        <div>
          <Label className="mb-1 block">Limit</Label>
          <Input type="number" min={1} max={500} value={limit} onChange={(e) => setLimit(Number(e.target.value || 50))} />
          <p className="text-xs mt-1 text-slate-600 dark:text-slate-400">How many results to fetch (1–500).</p>
        </div>
        <div>
          <Label className="mb-1 block">From</Label>
          <Input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <Label className="mb-1 block">To</Label>
          <Input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
        <Button variant="outline" disabled={!hasPrereqs || loading} onClick={fetchLockout}>View Lockout State</Button>
        <Button variant="outline" disabled={!hasPrereqs || loading} onClick={fetchEvents}>View Recent Events</Button>
        <Button variant="outline" disabled={!hasPrereqs || loading} onClick={fetchRotationHistory}>View Rotation History</Button>
        <Button className="bg-red-600 hover:bg-red-700 text-white" disabled={!hasPrereqs || loading} onClick={doUnlock}>Unlock Account</Button>
      </div>
      {!hasPrereqs && (
        <p className="text-xs mt-2 text-slate-600 dark:text-slate-400">{disabledReason}</p>
      )}

      <Separator className="my-6" />

      <h4 className="text-sm text-slate-900 dark:text-white mb-3">Step 3 — Account Actions</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="mb-1 block">Ban Reason (optional)</Label>
          <Input value={banReason} onChange={(e) => setBanReason(e.target.value)} placeholder="Why are you banning this user?" />
          <p className="text-xs mt-1 text-slate-600 dark:text-slate-400">Adds a note to the security log; useful for audits.</p>
        </div>
        <div>
          <Label className="mb-1 block">New Username</Label>
          <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="new_username" />
          <p className="text-xs mt-1 text-slate-600 dark:text-slate-400">Choose a simple, unique name. User can change later.</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <Button className="bg-red-600 hover:bg-red-700 text-white" disabled={!hasPrereqs || loading} onClick={doBan}>Ban user and purge account</Button>
        <Button disabled={!hasPrereqs || loading || !newUsername.trim()} onClick={doChangeUsername}>Change account username</Button>
      </div>

      {message && (
        <div role="alert" className="mt-6 rounded-md border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-200 p-3 text-sm">
          {message}
        </div>
      )}
      {error && (
        <div role="alert" className="mt-6 rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-200 p-3 text-sm">
          {error}
        </div>
      )}

      {lockoutState && (
        <div className="mt-6 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
          <h4 className="text-sm text-slate-900 dark:text-white mb-2">Lockout State</h4>
          <pre className="text-xs overflow-auto max-h-64 bg-slate-50 dark:bg-slate-900/30 p-3 rounded-md">{JSON.stringify(lockoutState, null, 2)}</pre>
        </div>
      )}

      {events && events.length > 0 && (
        <>
          <div className="mt-6 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
            <h4 className="text-sm text-slate-900 dark:text-white mb-2">File Event Counters</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 p-3">
                <div className="text-xs text-slate-600 dark:text-slate-400">Uploaded</div>
                <div className="text-lg text-slate-900 dark:text-white">{fileCounts.file_uploaded}</div>
              </Card>
              <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 p-3">
                <div className="text-xs text-slate-600 dark:text-slate-400">Deleted</div>
                <div className="text-lg text-slate-900 dark:text-white">{fileCounts.file_deleted}</div>
              </Card>
              <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 p-3">
                <div className="text-xs text-slate-600 dark:text-slate-400">Previewed</div>
                <div className="text-lg text-slate-900 dark:text-white">{fileCounts.file_previewed}</div>
              </Card>
              <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 p-3">
                <div className="text-xs text-slate-600 dark:text-slate-400">Upload Failed</div>
                <div className="text-lg text-slate-900 dark:text-white">{fileCounts.file_upload_failed}</div>
              </Card>
              <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 p-3">
                <div className="text-xs text-slate-600 dark:text-slate-400">Rolled Back</div>
                <div className="text-lg text-slate-900 dark:text-white">{fileCounts.file_version_rolled_back}</div>
              </Card>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
            <h4 className="text-sm text-slate-900 dark:text-white mb-2">Recent Security Events</h4>
            <div className="overflow-auto">
              <table className="w-full text-left text-xs">
              <thead className="text-slate-600 dark:text-slate-400">
                <tr>
                  <th className="py-2">Type</th>
                  <th className="py-2">Email</th>
                  <th className="py-2">IP</th>
                  <th className="py-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev: any, i: number) => (
                  <tr key={ev?.id || i} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="py-2">{ev?.eventType}</td>
                    <td className="py-2">{ev?.email || ''}</td>
                    <td className="py-2">{ev?.ip || ''}</td>
                    <td className="py-2">{new Date(ev?.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}

      {rotations && rotations.length > 0 && (
        <div className="mt-6 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
          <h4 className="text-sm text-slate-900 dark:text-white mb-2">Rotation History</h4>
          <div className="overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-600 dark:text-slate-400">
                <tr>
                  <th className="py-2">Type</th>
                  <th className="py-2">IP</th>
                  <th className="py-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {rotations.map((ev: any, i: number) => (
                  <tr key={ev?.id || i} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="py-2">{ev?.eventType}</td>
                    <td className="py-2">{ev?.ip || ''}</td>
                    <td className="py-2">{new Date(ev?.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}

function SecuritySection() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadSessions() {
    setLoading(true); setError(null);
    try {
      const list = await getSessions();
      setSessions(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load sessions');
    } finally { setLoading(false); }
  }

  useEffect(() => { loadSessions(); }, []);

  async function handleRename(id: number, currentName: string) {
    const deviceName = window.prompt('Rename device', currentName || '');
    if (deviceName === null) return;
    try {
      await renameSession(id, deviceName.trim());
      toast.success('Session renamed');
      loadSessions();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to rename session');
    }
  }

  async function handleRevoke(id: number) {
    if (!window.confirm('Revoke this session? The device will be signed out.')) return;
    try {
      await revokeSession(id);
      toast.success('Session revoked');
      loadSessions();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to revoke session');
    }
  }

  async function handleRevokeOthers(id: number) {
    if (!window.confirm('Revoke all other sessions except this one?')) return;
    try {
      const res = await revokeOtherSessions(id);
      toast.success(`Revoked ${res?.revokedCount ?? 0} other sessions`);
      loadSessions();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to revoke other sessions');
    }
  }

  function formatTime(t?: string) {
    if (!t) return '—';
    try {
      const d = new Date(t);
      return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
    } catch { return String(t); }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-slate-900 dark:text-white">Sessions</h3>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={loadSessions} disabled={loading}>Refresh</Button>
          </div>
        </div>
        {error && (
          <div role="alert" className="mb-4 rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-200 p-3 text-sm">{error}</div>
        )}
        {loading ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">Loading sessions...</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">No active sessions.</p>
        ) : (
          <div className="space-y-2">
            {sessions.map((s: any) => (
              <div key={s?.id} className="flex items-start justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-900 dark:text-white font-medium">{s?.deviceName || 'Unnamed device'}</span>
                    {s?.revokedAt && (<Badge variant="secondary">Revoked</Badge>)}
                    {s?.isCurrent && (<Badge className="bg-indigo-600 text-white">Current</Badge>)}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">IP: {s?.ip || 'unknown'} | UA: {String(s?.userAgent || '').slice(0, 80)}{String(s?.userAgent || '').length > 80 ? '…' : ''}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">Created: {formatTime(s?.createdAt)} | Last used: {formatTime(s?.lastUsedAt)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleRename(Number(s?.id), String(s?.deviceName || ''))}>Rename</Button>
                  <Button variant="outline" size="sm" onClick={() => handleRevoke(Number(s?.id))} disabled={Boolean(s?.revokedAt)}>Revoke</Button>
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => handleRevokeOthers(Number(s?.id))}>Revoke others</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
