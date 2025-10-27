import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Checkbox } from './ui/checkbox';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Separator } from './ui/separator';
import {
  Calendar,
  User,
  CheckCircle2,
  Sparkles,
  Clock,
  MessageSquare,
  Paperclip,
  MoreHorizontal,
  Image as ImageIcon,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { Task } from '../types';
import {
  updateTaskStatus,
  deleteTask,
  listMembers,
  getCurrentUser,
  listAttachments,
  uploadAttachment,
  deleteAttachment,
  getAttachmentPreviewUrl,
  listAttachmentVersions,
  rollbackAttachmentVersion,
} from '@lib/api';
import { toast } from 'sonner';
import CommentsPanel from './CommentsPanel';
import { useOptimisticTask, OptimisticIndicator } from '../lib/optimistic-ui';

interface TaskModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  // Optional team context: when present, gate actions by role
  teamId?: number | null;
  onActiveThreadChange?: (threadId: number | null) => void;
}

export function TaskModal({ task, isOpen, onClose, teamId, onActiveThreadChange }: TaskModalProps) {
  const [showAiSuggestions, setShowAiSuggestions] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [userRole, setUserRole] = useState<'viewer' | 'member' | 'admin' | 'owner' | null>(null);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [versionsFor, setVersionsFor] = useState<number | null>(null);

  // Use optimistic UI for task updates
  const optimisticTask = useOptimisticTask(task || ({} as Task));

  useEffect(() => {
    async function loadAttachments() {
      if (!task) return;
      try {
        const items = await listAttachments({
          taskId: Number(task.id),
          teamId: teamId || undefined,
        });
        setAttachments(items || []);
      } catch {}
    }
    if (isOpen) loadAttachments();
  }, [task?.id, isOpen, teamId]);

  useEffect(() => {
    let cancelled = false;
    async function loadRole() {
      try {
        if (!teamId) {
          setUserRole(null);
          return;
        }
        const members = await listMembers(Number(teamId));
        const cu = getCurrentUser();
        const my = (members || []).find((m: any) => Number(m?.user?.id) === Number(cu?.id));
        if (!cancelled) setUserRole((my?.role || 'viewer') as any);
      } catch {
        if (!cancelled) setUserRole('viewer');
      }
    }
    loadRole();
    return () => {
      cancelled = true;
    };
  }, [teamId, isOpen]);

  if (!task) return null;

  const ROLE_ORDER: Record<string, number> = { viewer: 0, member: 1, admin: 2, owner: 3 };
  const canUpdate = !teamId || (userRole ? ROLE_ORDER[userRole] >= ROLE_ORDER['member'] : false);
  const canDelete = !teamId || (userRole ? ROLE_ORDER[userRole] >= ROLE_ORDER['admin'] : false);
  const updating = optimisticTask.isOptimistic; // ensure defined during optimistic updates

  async function handleMarkDone() {
    if (!canUpdate) {
      toast.error('Insufficient role to update tasks');
      return;
    }

    await optimisticTask.actions.markAsDone(async () => {
      const updated = await updateTaskStatus(task.id, 'done', teamId ?? undefined);
      return updated;
    });

    toast.success('Task marked as done');
    window.dispatchEvent(new CustomEvent('tasks:changed'));
    onClose();
  }

  async function handleDelete() {
    if (!canDelete) {
      toast.error('Insufficient role to delete tasks');
      return;
    }
    if (!confirm('Delete this task?')) return;
    setDeleting(true);
    try {
      await deleteTask(task.id, teamId ?? undefined);
      toast.success('Task deleted');
      window.dispatchEvent(new CustomEvent('tasks:changed'));
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete task');
    } finally {
      setDeleting(false);
    }
  }

  const aiSuggestions = [
    'Add subtask: Set up database migrations',
    'Add subtask: Write unit tests for auth flow',
    'Suggested deadline: Oct 28',
  ];

  const activityLog = [
    {
      id: '1',
      user: 'Alex Chen',
      action: 'updated status to In Progress',
      timestamp: '2 hours ago',
    },
    {
      id: '2',
      user: 'Sarah Park',
      action: 'added a comment',
      timestamp: '5 hours ago',
    },
    {
      id: '3',
      user: 'Alex Chen',
      action: 'created this task',
      timestamp: '2 days ago',
    },
  ];

  const completedSubtasks = task.subtasks.filter((s) => s.completed).length;
  const progress = (completedSubtasks / task.subtasks.length) * 100;

  async function handleUpload(file: File) {
    try {
      setUploading(true);
      const saved = await uploadAttachment({
        file,
        taskId: Number(task.id),
        teamId: teamId || undefined,
      });
      setAttachments((prev) => [saved, ...prev]);
      toast.success('File uploaded');
    } catch (e: any) {
      toast.error(e?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteAttachment(id: number) {
    try {
      await deleteAttachment(id, teamId || undefined);
      setAttachments((prev) => prev.filter((a) => Number(a.id) !== Number(id)));
      toast.success('Attachment deleted');
    } catch (e: any) {
      toast.error(e?.message || 'Delete failed');
    }
  }

  async function openVersions(id: number) {
    try {
      const vers = await listAttachmentVersions(id);
      setAttachments((prev) =>
        prev.map((a) => (Number(a.id) === Number(id) ? { ...a, _versions: vers } : a))
      );
      setVersionsFor(id);
    } catch {}
  }

  async function handleRollback(id: number, versionNumber: number) {
    try {
      const att = await rollbackAttachmentVersion(id, versionNumber, teamId || undefined);
      setAttachments((prev) => prev.map((a) => (Number(a.id) === Number(id) ? att : a)));
      toast.success('Rolled back to selected version');
    } catch (e: any) {
      toast.error(e?.message || 'Rollback failed');
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-2xl text-slate-900 dark:text-white mb-3">
                {task.title}
              </DialogTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  className={`${
                    task.priority === 'critical'
                      ? 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400'
                      : task.priority === 'high'
                        ? 'bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400'
                        : task.priority === 'medium'
                          ? 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  } border-0 text-xs`}
                >
                  {task.priority}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {optimisticTask.data?.status || task.status}
                </Badge>
                {task.aiSuggested && (
                  <Badge className="bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border-0 text-xs">
                    <Sparkles className="w-3 h-3 mr-1" />
                    AI suggested
                  </Badge>
                )}
                {task.labels.map((label) => (
                  <Badge key={label} variant="outline" className="text-xs">
                    {label}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkDone}
                disabled={
                  optimisticTask.isOptimistic ||
                  deleting ||
                  (optimisticTask.data?.status || task.status) === 'done' ||
                  !canUpdate
                }
                className="text-green-600 dark:text-green-400 border-green-600 dark:border-green-600"
              >
                Mark done
              </Button>
              <OptimisticIndicator isOptimistic={optimisticTask.isOptimistic} className="ml-2" />
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                disabled={updating || deleting || !canDelete}
                className="text-red-600 dark:text-red-400 border-red-600 dark:border-red-600"
              >
                Delete
              </Button>
              <Button variant="ghost" size="sm" disabled={updating || deleting}>
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            {/* Description */}
            <div>
              <h4 className="text-sm text-slate-900 dark:text-white mb-2">Description</h4>
              {task.description ? (
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {task.description}
                </p>
              ) : (
                <p className="text-sm text-slate-400 italic">No description</p>
              )}
            </div>

            <Separator />

            {/* Subtasks */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm text-slate-900 dark:text-white">
                  Subtasks ({completedSubtasks}/{task.subtasks.length})
                </h4>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {Math.round(progress)}% complete
                </span>
              </div>
              <Progress value={progress} className="h-1.5 mb-4" />
              <div className="space-y-2">
                {task.subtasks.map((subtask) => (
                  <div
                    key={subtask.id}
                    className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700"
                  >
                    <Checkbox checked={subtask.completed} className="mt-0.5" />
                    <span
                      className={`text-sm flex-1 ${
                        subtask.completed
                          ? 'line-through text-slate-400'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {subtask.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Suggestions */}
            {showAiSuggestions && (
              <>
                <Separator />
                <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/50 rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <h4 className="text-sm text-indigo-900 dark:text-indigo-300">
                        AI suggestions
                      </h4>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAiSuggestions(false)}
                      className="h-6 text-xs"
                    >
                      Dismiss
                    </Button>
                  </div>
                  <ul className="space-y-2">
                    {aiSuggestions.map((suggestion, i) => (
                      <li
                        key={i}
                        className="text-sm text-indigo-700 dark:text-indigo-400 flex items-start gap-2"
                      >
                        <CheckCircle2 className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            <Separator />

            {/* Comments */}
            <div>
              <h4 className="text-sm text-slate-900 dark:text-white mb-3">Comments</h4>
              <div className="space-y-3 mb-4">
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-slate-200 dark:bg-slate-700">
                      AC
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm text-slate-900 dark:text-white">Alex Chen</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          2 hours ago
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        I've started working on this. Should have it done by end of week.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Input placeholder="Add a comment..." className="text-sm" />
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  <MessageSquare className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <Separator />

            {/* Activity */}
            <div>
              <h4 className="text-sm text-slate-900 dark:text-white mb-3">Activity</h4>
              <div className="space-y-3">
                {activityLog.map((activity) => (
                  <div key={activity.id} className="flex gap-3 text-sm">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px] bg-slate-200 dark:bg-slate-700">
                        {activity.user
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-slate-600 dark:text-slate-400">
                        <span className="text-slate-900 dark:text-white">{activity.user}</span>{' '}
                        {activity.action}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {activity.timestamp}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <h4 className="text-sm text-slate-900 dark:text-white mb-4">Details</h4>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
                    <User className="w-3 h-3" />
                    <span>Assignee</span>
                  </div>
                  {task.assignee ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs bg-slate-200 dark:bg-slate-700">
                          {task.assignee
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-slate-900 dark:text-white">
                        {task.assignee}
                      </span>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      Assign
                    </Button>
                  )}
                </div>

                <Separator />

                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
                    <Calendar className="w-3 h-3" />
                    <span>Due date</span>
                  </div>
                  {task.dueDate ? (
                    <p className="text-sm text-slate-900 dark:text-white">
                      {new Date(task.dueDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  ) : (
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      Set date
                    </Button>
                  )}
                </div>

                <Separator />

                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
                    <Clock className="w-3 h-3" />
                    <span>Estimate</span>
                  </div>
                  {task.timeEstimate ? (
                    <p className="text-sm text-slate-900 dark:text-white">{task.timeEstimate}</p>
                  ) : (
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      Add estimate
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <Button variant="outline" className="w-full justify-start">
              <Paperclip className="w-4 h-4 mr-2" />
              Manage attachments
            </Button>

            {/* Attachments Section */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm text-slate-900 dark:text-white">Attachments</h4>
                <input
                  type="file"
                  multiple={false}
                  disabled={uploading || !canUpdate}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(f);
                  }}
                />
              </div>
              <div
                className={`border-2 border-dashed rounded-md p-3 text-xs ${uploading ? 'opacity-50' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (!canUpdate) return;
                  const f = e.dataTransfer.files?.[0];
                  if (f) handleUpload(f);
                }}
              >
                Drag & drop a file here or use the picker.
                <div className="text-slate-500 mt-1">
                  Allowed: PNG, JPEG, GIF, PDF, TXT. Max 10MB.
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {attachments.length === 0 && (
                  <div className="text-xs text-slate-500">No attachments</div>
                )}
                {attachments.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between gap-3 p-2 bg-white/50 dark:bg-slate-900/40 rounded border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-slate-500" />
                      <div>
                        <div className="text-sm text-slate-900 dark:text-white">{a.filename}</div>
                        <div className="text-xs text-slate-500">
                          {(a.size / 1024).toFixed(1)} KB • v{a.latestVersionNumber}
                        </div>
                        {String(a.mimeType).startsWith('image/') && (
                          <img
                            src={getAttachmentPreviewUrl(Number(a.id), teamId || undefined)}
                            alt={a.filename}
                            className="mt-2 h-24 rounded"
                          />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openVersions(Number(a.id))}>
                        Versions
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={!canDelete}
                        onClick={() => handleDeleteAttachment(Number(a.id))}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              {versionsFor && (
                <div className="mt-3 p-2 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      Version history
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setVersionsFor(null)}>
                      Close
                    </Button>
                  </div>
                  <div className="mt-2 space-y-2">
                    {(
                      attachments.find((x) => Number(x.id) === Number(versionsFor))?._versions || []
                    ).map((v: any) => (
                      <div key={v.id} className="flex items-center justify-between text-xs">
                        <div>
                          v{v.versionNumber} • {(v.size / 1024).toFixed(1)} KB •{' '}
                          {new Date(v.createdAt).toLocaleString()}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={!canDelete}
                          onClick={() =>
                            handleRollback(Number(versionsFor), Number(v.versionNumber))
                          }
                        >
                          <RotateCcw className="w-3 h-3 mr-1" /> Roll back
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {task && (
              <div className="mt-4">
                <CommentsPanel
                  task={{ id: Number(task.id), projectId: task.projectId as any }}
                  onActiveThreadChange={onActiveThreadChange}
                />
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
