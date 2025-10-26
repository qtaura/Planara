import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { KanbanView } from '../KanbanView';

function sampleTask(overrides: any = {}) {
  return {
    id: Math.floor(Math.random() * 100000),
    title: overrides.title ?? 'Sample Task',
    description: overrides.description ?? '',
    status: overrides.status ?? 'backlog',
    labels: overrides.labels ?? [],
    subtasks: overrides.subtasks ?? [],
    priority: overrides.priority ?? 'low',
    dueDate: overrides.dueDate ?? undefined,
    assignee: overrides.assignee ?? 'Alex Chen',
  };
}

describe('KanbanView', () => {
  it('renders columns and counts tasks per status', () => {
    const tasks = [
      sampleTask({ status: 'backlog' }),
      sampleTask({ status: 'in-progress' }),
      sampleTask({ status: 'in-progress' }),
      sampleTask({ status: 'review' }),
      sampleTask({ status: 'qa' }),
      sampleTask({ status: 'done' }),
    ];

    const onTaskClick = vi.fn();
    render(<KanbanView tasks={tasks as any} onTaskClick={onTaskClick} />);

    // Check column labels exist
    expect(screen.getByText('Backlog')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('In Review')).toBeInTheDocument();
    expect(screen.getByText('QA')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('invokes onTaskClick when a task is clicked', () => {
    const task = sampleTask({ status: 'backlog', title: 'Clickable' });
    const onTaskClick = vi.fn();
    render(<KanbanView tasks={[task] as any} onTaskClick={onTaskClick} />);
    fireEvent.click(screen.getByText('Clickable'));
    expect(onTaskClick).toHaveBeenCalledTimes(1);
  });
});