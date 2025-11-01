import React, { useEffect, useState } from 'react';
import { searchTasks, searchProjects, searchComments } from '../lib/api';
import { Input } from './ui/input';
import { Button } from './ui/button';

// Lightweight select using native <select> to avoid new dependencies
function TypeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      className="h-9 px-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="tasks">Tasks</option>
      <option value="projects">Projects</option>
      <option value="comments">Comments</option>
    </select>
  );
}

function useSearchParams() {
  const [params, setParams] = useState(() => new URLSearchParams(window.location.search));
  useEffect(() => {
    const handler = () => setParams(new URLSearchParams(window.location.search));
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);
  return params;
}

export default function SearchView() {
  const params = useSearchParams();
  const [type, setType] = useState<string>(params.get('type') || 'tasks');
  const [q, setQ] = useState<string>(params.get('q') || '');
  const [teamId, setTeamId] = useState<string>(params.get('teamId') || '');
  const [projectId, setProjectId] = useState<string>(params.get('projectId') || '');
  const [from, setFrom] = useState<string>(params.get('from') || '');
  const [to, setTo] = useState<string>(params.get('to') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);

  // Keep local UI state in sync if URL changes externally
  useEffect(() => {
    setType(params.get('type') || 'tasks');
    setQ(params.get('q') || '');
    setTeamId(params.get('teamId') || '');
    setProjectId(params.get('projectId') || '');
    setFrom(params.get('from') || '');
    setTo(params.get('to') || '');
  }, [params]);

  async function runSearch() {
    setLoading(true);
    setError(null);
    try {
      if (type === 'tasks') {
        const res = await searchTasks({
          q,
          teamId: teamId ? Number(teamId) : undefined,
          projectId: projectId ? Number(projectId) : undefined,
          limit: 50,
        });
        setItems(res.items || []);
      } else if (type === 'projects') {
        const res = await searchProjects({
          q,
          teamId: teamId ? Number(teamId) : undefined,
          from: from || undefined,
          to: to || undefined,
          limit: 50,
        });
        setItems(res.items || []);
      } else {
        const res = await searchComments({
          q,
          teamId: teamId ? Number(teamId) : undefined,
          projectId: projectId ? Number(projectId) : undefined,
          from: from || undefined,
          to: to || undefined,
          limit: 50,
        });
        setItems(res.items || []);
      }
    } catch (e: any) {
      setError(e?.message || 'Search failed');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  function updateUrl() {
    const next = new URLSearchParams();
    next.set('type', type);
    if (q) next.set('q', q);
    if (teamId) next.set('teamId', teamId);
    if (projectId) next.set('projectId', projectId);
    if (from) next.set('from', from);
    if (to) next.set('to', to);
    const url = `/search?${next.toString()}`;
    window.history.pushState({}, '', url);
  }

  useEffect(() => {
    // Auto-run search when URL changes, initial mount included
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, q, teamId, projectId, from, to]);

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <TypeSelect
          value={type}
          onChange={(v) => {
            setType(v);
          }}
        />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              updateUrl();
              runSearch();
            }
          }}
          placeholder="Search query..."
          className="h-9 w-80"
        />
        <Input
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          placeholder="teamId (optional)"
          className="h-9 w-40"
        />
        {(type === 'tasks' || type === 'comments') && (
          <Input
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            placeholder="projectId (optional)"
            className="h-9 w-40"
          />
        )}
        {(type === 'projects' || type === 'comments') && (
          <>
            <Input
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="from (ISO date)"
              className="h-9 w-40"
            />
            <Input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="to (ISO date)"
              className="h-9 w-40"
            />
          </>
        )}
        <Button
          onClick={() => {
            updateUrl();
            runSearch();
          }}
          className="h-9"
        >
          Search
        </Button>
      </div>

      {loading && <p className="text-sm text-slate-600 dark:text-slate-300">Searching...</p>}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="mt-4 space-y-2">
        {items.length === 0 && !loading && (
          <p className="text-sm text-slate-600 dark:text-slate-300">No results</p>
        )}
        {items.map((it: any) => (
          <div
            key={`${it.type}:${it.id}`}
            className="p-3 rounded-md border border-slate-200 dark:border-slate-800"
          >
            {type === 'tasks' && (
              <div>
                <div className="text-sm font-medium">{it.title}</div>
                {it.description && (
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    {it.description}
                  </div>
                )}
                <div className="text-xs text-slate-500 mt-1">
                  Status: {it.status} • Priority: {it.priority} • Project: {it.projectId ?? '—'} •
                  Assignee: {it.assignee ?? '—'}
                </div>
              </div>
            )}
            {type === 'projects' && (
              <div>
                <div className="text-sm font-medium">{it.name}</div>
                {it.description && (
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    {it.description}
                  </div>
                )}
                <div className="text-xs text-slate-500 mt-1">
                  Created: {it.createdAt ? new Date(it.createdAt).toLocaleString() : '—'} •
                  Archived: {String(!!it.archived)}
                </div>
              </div>
            )}
            {type === 'comments' && (
              <div>
                <div className="text-sm">{it.content}</div>
                <div className="text-xs text-slate-500 mt-1">
                  Task: {it.taskId ?? '—'} • Project: {it.projectId ?? '—'} • Author:{' '}
                  {it.author ?? '—'} • At:{' '}
                  {it.createdAt ? new Date(it.createdAt).toLocaleString() : '—'}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
