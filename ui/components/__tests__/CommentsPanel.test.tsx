import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CommentsPanel from '../CommentsPanel';

// Mock API used by CommentsPanel (component imports ../../lib/api relative to this test)
vi.mock('../../lib/api', () => {
  return {
    listComments: vi.fn(async () => [
      // Two root threads with ids 11 and 22
      { id: 1, content: 'Root A start', taskId: 123, parentCommentId: null, threadId: 11 },
      { id: 2, content: 'Root B start', taskId: 123, parentCommentId: null, threadId: 22 },
      // Children
      { id: 3, content: 'Reply A1', taskId: 123, parentCommentId: 1, threadId: 11 },
      { id: 4, content: 'Reply B1', taskId: 123, parentCommentId: 2, threadId: 22 },
    ]),
    createComment: vi.fn(async () => ({ id: 99 })),
    createReply: vi.fn(async () => ({ id: 100 })),
    reactToComment: vi.fn(async () => ({ ok: true })),
  };
});

describe('CommentsPanel: thread selection persistence', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Reset localStorage for isolation
    localStorage.clear();
  });

  it('restores last-selected thread on mount and emits change', async () => {
    // Pre-save thread 22 for task 123
    localStorage.setItem('lastThread_task_123', '22');
    const onActiveThreadChange = vi.fn();

    render(<CommentsPanel task={{ id: 123 }} onActiveThreadChange={onActiveThreadChange} />);

    await waitFor(() => {
      expect(onActiveThreadChange).toHaveBeenCalledWith(22);
    });
  });

  it('saves to localStorage on root selection and emits change', async () => {
    const onActiveThreadChange = vi.fn();
    render(<CommentsPanel task={{ id: 123 }} onActiveThreadChange={onActiveThreadChange} />);

    // Wait for comments to render
    const rootA = await screen.findByText('Root A start');
    // Click root to select its thread
    fireEvent.click(rootA);

    await waitFor(() => {
      expect(onActiveThreadChange).toHaveBeenCalledWith(11);
    });
    expect(localStorage.getItem('lastThread_task_123')).toBe('11');
  });
});