import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Github, Lock, Globe, RefreshCw } from 'lucide-react';
import { createProject } from '@lib/api';
import { toast } from 'sonner';

interface GitHubRepoPickerProps {
  isOpen: boolean;
  accessToken: string | null;
  onClose: () => void;
  onLinked: () => void;
}

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  updated_at: string;
  owner?: { login?: string };
}

export function GitHubRepoPicker({ isOpen, accessToken, onClose, onLinked }: GitHubRepoPickerProps) {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [linkingRepoId, setLinkingRepoId] = useState<number | null>(null);

  async function fetchRepos() {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('https://api.github.com/user/repos?per_page=50&sort=updated', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'Planara',
        },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Failed to list repositories: ${res.status}`);
      }
      const data = await res.json();
      setRepos(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load repositories');
      toast.error(e?.message || 'Failed to load repositories');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchRepos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, accessToken]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return repos;
    return repos.filter((r) =>
      r.name.toLowerCase().includes(q) || r.full_name.toLowerCase().includes(q)
    );
  }, [repos, query]);

  async function linkRepo(r: GitHubRepo) {
    try {
      setLinkingRepoId(r.id);
      const payload: any = {
        name: r.name,
        description: r.description || '',
        favorite: false,
        archived: false,
      };
      const project = await createProject(payload);
      toast.success(`Linked ${r.full_name}`);
      // Optimistically mark UI project as linked (badge relies on githubLinked in UI)
      try { onLinked(); } catch {}
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to link repository');
    } finally {
      setLinkingRepoId(null);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-white">Import from GitHub</DialogTitle>
          <DialogDescription className="text-slate-600 dark:text-slate-400">
            Select a repository to create a linked project
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm mb-3">
            {error}
          </div>
        )}

        <div className="flex items-center gap-2 mb-4">
          <Input
            placeholder="Search repositories..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10"
            disabled={loading}
          />
          <Button variant="outline" onClick={fetchRepos} disabled={loading} className="h-10">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="space-y-2">
          {loading ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">Loading repositories…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">No repositories found.</p>
          ) : (
            filtered.map((repo) => (
              <div key={repo.id} className="flex items-center justify-between p-3 border rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <Github className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                  <div>
                    <p className="text-slate-900 dark:text-white font-medium">{repo.full_name}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{repo.description || 'No description'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {repo.private ? (
                        <Badge variant="outline" className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300">
                          <Lock className="w-3 h-3 mr-1 inline" /> Private
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300">
                          <Globe className="w-3 h-3 mr-1 inline" /> Public
                        </Badge>
                      )}
                      <Badge variant="outline" className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300">
                        Updated {new Date(repo.updated_at).toLocaleDateString()}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  onClick={() => linkRepo(repo)}
                  disabled={linkingRepoId === repo.id}
                >
                  {linkingRepoId === repo.id ? 'Linking…' : 'Link'}
                </Button>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}