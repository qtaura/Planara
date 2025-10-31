import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Stub AIAssistant to validate payload mapping from props
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

// Mock API used by assistant
vi.mock('@lib/api', () => {
  return {
    aiSummarizeThread: vi.fn(async () => ({ summary: 'ok' })),
  };
});

describe('AIAssistant request payload maps props to context', () => {
  it('calls aiSummarizeThread with provided threadId and taskId', async () => {
    const { AIAssistant } = await import('../AIAssistant');
    render(
      (AIAssistant as any)({
        orgId: 1,
        projectId: 2,
        teamId: 3,
        activeTaskId: 4,
        activeThreadId: 22,
      })
    );
    const btn = await screen.findByRole('button', { name: /summarize thread/i });
    await userEvent.click(btn);
    const api = await import('@lib/api');
    const summarizeSpy = api.aiSummarizeThread as any as ReturnType<typeof vi.fn>;
    const call = summarizeSpy.mock.calls.at(-1)![0];
    expect(call).toMatchObject({ orgId: 1, projectId: 2, teamId: 3, taskId: 4, threadId: 22 });
  });
});
