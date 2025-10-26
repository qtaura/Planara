import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TaskModal } from '../TaskModal';

vi.mock('@lib/api', () => ({
  listAttachments: async () => [],
  listMembers: async () => [],
  getCurrentUser: () => ({ id: 1 }),
}));

const task = {
  id: 123,
  title: 'Edit the docs',
  description: 'Update README with latest info',
  status: 'in-progress',
  labels: ['docs'],
  subtasks: [],
  priority: 'medium',
  dueDate: undefined,
  assignee: 'Alex',
} as any;

describe('TaskModal', () => {
  it('renders task title when open', () => {
    render(<TaskModal task={task} isOpen={true} onClose={() => {}} teamId={null} />);
    expect(screen.getByText('Edit the docs')).toBeInTheDocument();
    expect(screen.getByText('docs')).toBeInTheDocument();
  });
});