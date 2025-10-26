import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Calendar, MoreHorizontal } from 'lucide-react';
import { Task } from '../types';
import { Button } from './ui/button';

interface KanbanViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export function KanbanView({ tasks, onTaskClick }: KanbanViewProps) {
  const columns = ['backlog', 'in-progress', 'review', 'qa', 'done'] as const;

  const columnLabels: Record<(typeof columns)[number], string> = {
    backlog: 'Backlog',
    'in-progress': 'In Progress',
    review: 'In Review',
    qa: 'QA',
    done: 'Done',
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 h-full">
      {columns.map((column) => {
        const columnTasks = tasks.filter((t) => t.status === column);

        return (
          <div key={column} className="flex-shrink-0 w-80">
            <div className="mb-3 px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm text-slate-900 dark:text-white">{columnLabels[column]}</h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {columnTasks.length}
                </span>
              </div>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              {columnTasks.map((task) => (
                <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
              ))}

              {columnTasks.length === 0 && (
                <div className="p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-center">
                  <p className="text-sm text-slate-400">No tasks</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

function TaskCard({ task, onClick }: TaskCardProps) {
  const priorityColors: Record<string, string> = {
    low: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
    medium: 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400',
    high: 'bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400',
    critical: 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400',
  };

  const completedSubtasks = task.subtasks.filter((s) => s.completed).length;
  const totalSubtasks = task.subtasks.length;

  return (
    <button onClick={onClick} className="w-full text-left">
      <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 p-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
        <h4 className="text-sm text-slate-900 dark:text-white mb-2">{task.title}</h4>

        {task.description && (
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">
            {task.description}
          </p>
        )}

        {task.labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {task.labels.map((label) => (
              <Badge
                key={label}
                variant="outline"
                className="border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs px-2 py-0"
              >
                {label}
              </Badge>
            ))}
          </div>
        )}

        {totalSubtasks > 0 && (
          <div className="mb-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {completedSubtasks}/{totalSubtasks} subtasks
            </p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className={`${priorityColors[task.priority]} border-0 text-xs px-2 py-0`}>
              {task.priority}
            </Badge>
            {task.dueDate && (
              <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                <Calendar className="w-3 h-3" />
                <span>
                  {new Date(task.dueDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            )}
          </div>

          {task.assignee && (
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                {task.assignee
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </Card>
    </button>
  );
}
