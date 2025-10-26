import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Github, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE } from '@lib/api';

interface GitHubRepoPickerProps {
  isOpen: boolean;
  accessToken: string | null;
  onClose: () => void;
  onLinked: () => void;
}

export function GitHubRepoPicker({
  isOpen,
  accessToken,
  onClose,
  onLinked,
}: GitHubRepoPickerProps) {
  const [repos, setRepos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  // Only fetch when the dialog is open and we have a token
  useEffect(() => {
    async function fetchRepos() {
      if (!accessToken || !isOpen) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`https://api.github.com/user/repos?per_page=100`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) throw new Error(`GitHub error: ${res.status}`);
        const data = await res.json();
        setRepos(Array.isArray(data) ? data : []);
      } catch (e: any) {
        setError(e?.message || 'Failed to load GitHub repositories');
        toast.error(e?.message || 'Failed to load GitHub repositories');
      } finally {
        setLoading(false);
      }
    }
    fetchRepos().catch(() => {});
  }, [accessToken, isOpen]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return repos.filter((r) => `${r.owner?.login || ''}/${r.name || ''}`.toLowerCase().includes(q));
  }, [query, repos]);

  function switchAccount() {
    const url = `${API_BASE}/users/oauth/github/start?origin=${encodeURIComponent(window.location.origin)}`;
    window.open(url, 'oauth', 'width=600,height=700');
    toast.message('Re-run GitHub sign-in to switch accounts');
  }

  async function linkRepository(repo: any) {
    try {
      const body = {
        provider: 'github',
        repo_full_name: `${repo.owner?.login}/${repo.name}`,
        repo_id: repo.id,
      };
      const res = await fetch(`/api/projects/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to link repository');
      toast.success('Repository linked');
      onLinked();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to link repository');
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import from GitHub</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <Github className="h-4 w-4" />
            <span className="text-sm">Select a repository to import</span>
          </div>
          <Button variant="ghost" size="sm" onClick={switchAccount} title="Switch GitHub account">
            <RefreshCw className="h-4 w-4" />
            <span className="ml-2">Switch account</span>
          </Button>
        </div>

        <div className="mb-3 flex items-center gap-2">
          <Search className="h-4 w-4 text-slate-400" />
          <Input
            placeholder="Filter repositories"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {loading ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">Loading repositories…</p>
        ) : error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : filtered.length === 0 ? (
          <Card className="p-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">No repositories found</p>
          </Card>
        ) : (
          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-2">
            {filtered.map((repo) => (
              <Card key={repo.id} className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-slate-900 dark:text-white">
                    {repo.owner?.login}/{repo.name}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {repo.private ? 'Private' : 'Public'} • Updated{' '}
                    {new Date(repo.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <Button size="sm" onClick={() => linkRepository(repo)}>
                  Link
                </Button>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
