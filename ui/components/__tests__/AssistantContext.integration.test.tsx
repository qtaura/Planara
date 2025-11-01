import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskModal } from '../TaskModal';
import React, { useState } from 'react';
// Stub AIAssistant to a lightweight component that triggers summarize call
vi.mock('../AIAssistant', () => {
  return {
    AIAssistant: ({ orgId, projectId, teamId, activeTaskId, activeThreadId }: any) => {
      const onClick = async () => {
        const api = await import('@lib/api');
        await (api.aiSummarizeThread as any)({
          orgId,
          projectId,
          teamId,
          taskId: activeTaskId,
          threadId: activeThreadId,
        });
      };
      return (
        <button aria-label="Summarize thread" onClick={onClick}>
          Summarize thread
        </button>
      );
    },
  };
});

// Mock UI API used by components (alias used by AIAssistant and TaskModal)
vi.mock('@lib/api', () => {
  return {
    // Comments
    listComments: vi.fn(async () => [
      { id: 1, content: 'Thread A start', taskId: 555, parentCommentId: null, threadId: 11 },
      { id: 2, content: 'Thread B start', taskId: 555, parentCommentId: null, threadId: 22 },
    ]),
    // Assistant actions
    aiSummarizeThread: vi.fn(async () => ({
      summary: 'Summary OK',
      participants: ['alex'],
      commentCount: 2,
    })),
    aiAuthoringSuggest: vi.fn(async () => ({ suggestions: [], rationale: 'n/a' })),
    aiTriageEvaluate: vi.fn(async () => ({
      suggestedPriority: 'medium',
      blockers: [],
      signals: {},
    })),
    aiTeamInsights: vi.fn(async () => ({ metrics: {}, recommendations: [] })),
  };
});

// Also mock the relative path used by CommentsPanel inside TaskModal
vi.mock('../../lib/api', async () => {
  const mod = await vi.importMock('@lib/api');
  return mod as any;
});

describe('Integration: thread selection propagates to AIAssistant and request payload', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('selecting a thread updates assistant props and includes threadId in request', async () => {
    const task = { id: 555, title: 'Work item', projectId: 777 } as any;
    const Wrapper = () => {
      const [threadId, setThreadId] = useState<number | undefined>(undefined);
      return (
        <div>
          <TaskModal
            task={task}
            isOpen={true}
            onClose={() => {}}
            teamId={10}
            onActiveThreadChange={(tid) => setThreadId(tid ?? undefined)}
          />
          {React.createElement(require('../AIAssistant').AIAssistant, {
            orgId: 1,
            projectId: 777,
            teamId: 10,
            activeTaskId: 555,
            activeThreadId: threadId,
          })}
        </div>
      );
    };

    render(React.createElement(Wrapper));

    // Choose Thread B (threadId 22)
    const threadB = await screen.findByText('Thread B start');
    await userEvent.click(threadB);

    // Click "Summarize thread" on stubbed assistant
    const actionBtn = await screen.findByRole('button', { name: /summarize thread/i });
    await userEvent.click(actionBtn);

    const api = await import('@lib/api');
    const summarizeSpy = api.aiSummarizeThread as any as ReturnType<typeof vi.fn>;

    await waitFor(() => {
      expect(summarizeSpy).toHaveBeenCalled();
    });
    const call = summarizeSpy.mock.calls.at(-1)![0];
    expect(call.threadId).toBe(22);
    expect(call.orgId).toBe(1);
    expect(call.projectId).toBe(777);
    expect(call.teamId).toBe(10);
    expect(call.taskId).toBe(555);

    // We do not render the full assistant UI; prop propagation is validated via request payload
  });
});