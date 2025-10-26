import * as React from 'react';
import { toast } from 'sonner';
import { announceToScreenReader } from './accessibility';

/**
 * Optimistic UI utilities for better user experience
 */

export interface OptimisticState<T> {
  data: T;
  isOptimistic: boolean;
  error?: string;
  rollback?: () => void;
}

export interface OptimisticAction<T> {
  optimisticUpdate: (current: T) => T;
  serverAction: () => Promise<T>;
  onSuccess?: (result: T) => void;
  onError?: (error: Error, rollback: () => void) => void;
  successMessage?: string;
  errorMessage?: string;
  announceSuccess?: boolean;
  announceError?: boolean;
}

/**
 * Hook for managing optimistic updates with automatic rollback on error
 */
export function useOptimisticState<T>(initialData: T) {
  const [state, setState] = React.useState<OptimisticState<T>>({
    data: initialData,
    isOptimistic: false,
  });

  const executeOptimisticAction = React.useCallback(
    async (action: OptimisticAction<T>) => {
      const previousData = state.data;
      const optimisticData = action.optimisticUpdate(previousData);

      // Apply optimistic update immediately
      setState({
        data: optimisticData,
        isOptimistic: true,
        rollback: () => {
          setState({
            data: previousData,
            isOptimistic: false,
          });
        },
      });

      try {
        // Execute server action
        const result = await action.serverAction();

        // Success: update with server data
        setState({
          data: result,
          isOptimistic: false,
        });

        // Show success feedback
        if (action.successMessage) {
          toast.success(action.successMessage);
        }

        if (action.announceSuccess !== false) {
          announceToScreenReader(
            action.successMessage || 'Action completed successfully',
            'polite'
          );
        }

        action.onSuccess?.(result);
      } catch (error) {
        // Error: rollback to previous state
        const rollback = () => {
          setState({
            data: previousData,
            isOptimistic: false,
          });
        };

        rollback();

        const errorMessage =
          action.errorMessage || (error instanceof Error ? error.message : 'An error occurred');

        setState((prev) => ({
          ...prev,
          error: errorMessage,
        }));

        // Show error feedback
        toast.error(errorMessage);

        if (action.announceError !== false) {
          announceToScreenReader(errorMessage, 'assertive');
        }

        action.onError?.(error as Error, rollback);
      }
    },
    [state.data]
  );

  const updateData = React.useCallback((newData: T) => {
    setState({
      data: newData,
      isOptimistic: false,
    });
  }, []);

  const clearError = React.useCallback(() => {
    setState((prev) => ({
      ...prev,
      error: undefined,
    }));
  }, []);

  return {
    ...state,
    executeOptimisticAction,
    updateData,
    clearError,
  };
}

/**
 * Specific optimistic actions for common task operations
 */
export const taskOptimisticActions = {
  /**
   * Mark task as done optimistically
   */
  markAsDone: <T extends { id: string | number; status: string }>(
    serverAction: () => Promise<T>
  ): OptimisticAction<T> => ({
    optimisticUpdate: (task) => ({
      ...task,
      status: 'done',
    }),
    serverAction,
    successMessage: 'Task marked as done',
    errorMessage: 'Failed to mark task as done',
  }),

  /**
   * Update task status optimistically
   */
  updateStatus: <T extends { id: string | number; status: string }>(
    newStatus: string,
    serverAction: () => Promise<T>
  ): OptimisticAction<T> => ({
    optimisticUpdate: (task) => ({
      ...task,
      status: newStatus,
    }),
    serverAction,
    successMessage: `Task status updated to ${newStatus}`,
    errorMessage: 'Failed to update task status',
  }),

  /**
   * Update task title optimistically
   */
  updateTitle: <T extends { id: string | number; title: string }>(
    newTitle: string,
    serverAction: () => Promise<T>
  ): OptimisticAction<T> => ({
    optimisticUpdate: (task) => ({
      ...task,
      title: newTitle,
    }),
    serverAction,
    successMessage: 'Task title updated',
    errorMessage: 'Failed to update task title',
  }),

  /**
   * Update task description optimistically
   */
  updateDescription: <T extends { id: string | number; description?: string }>(
    newDescription: string,
    serverAction: () => Promise<T>
  ): OptimisticAction<T> => ({
    optimisticUpdate: (task) => ({
      ...task,
      description: newDescription,
    }),
    serverAction,
    successMessage: 'Task description updated',
    errorMessage: 'Failed to update task description',
  }),

  /**
   * Update task priority optimistically
   */
  updatePriority: <T extends { id: string | number; priority: string }>(
    newPriority: string,
    serverAction: () => Promise<T>
  ): OptimisticAction<T> => ({
    optimisticUpdate: (task) => ({
      ...task,
      priority: newPriority,
    }),
    serverAction,
    successMessage: `Task priority updated to ${newPriority}`,
    errorMessage: 'Failed to update task priority',
  }),

  /**
   * Update task assignee optimistically
   */
  updateAssignee: <T extends { id: string | number; assignee?: string }>(
    newAssignee: string,
    serverAction: () => Promise<T>
  ): OptimisticAction<T> => ({
    optimisticUpdate: (task) => ({
      ...task,
      assignee: newAssignee,
    }),
    serverAction,
    successMessage: `Task assigned to ${newAssignee}`,
    errorMessage: 'Failed to update task assignee',
  }),

  /**
   * Toggle subtask completion optimistically
   */
  toggleSubtask: <
    T extends {
      id: string | number;
      subtasks: Array<{ id: string | number; completed: boolean }>;
    },
  >(
    subtaskId: string | number,
    serverAction: () => Promise<T>
  ): OptimisticAction<T> => ({
    optimisticUpdate: (task) => ({
      ...task,
      subtasks: task.subtasks.map((subtask) =>
        subtask.id === subtaskId ? { ...subtask, completed: !subtask.completed } : subtask
      ),
    }),
    serverAction,
    successMessage: 'Subtask updated',
    errorMessage: 'Failed to update subtask',
  }),

  /**
   * Add new subtask optimistically
   */
  addSubtask: <
    T extends {
      id: string | number;
      subtasks: Array<{ id: string | number; title: string; completed: boolean }>;
    },
  >(
    newSubtask: { id: string | number; title: string; completed: boolean },
    serverAction: () => Promise<T>
  ): OptimisticAction<T> => ({
    optimisticUpdate: (task) => ({
      ...task,
      subtasks: [...task.subtasks, newSubtask],
    }),
    serverAction,
    successMessage: 'Subtask added',
    errorMessage: 'Failed to add subtask',
  }),

  /**
   * Delete task optimistically (for lists)
   */
  deleteTask: <T extends { id: string | number }>(
    taskId: string | number,
    serverAction: () => Promise<void>
  ): OptimisticAction<T[]> => ({
    optimisticUpdate: (tasks) => tasks.filter((task) => task.id !== taskId),
    serverAction: async () => {
      await serverAction();
      return [] as T[]; // Return empty array as we're filtering
    },
    successMessage: 'Task deleted',
    errorMessage: 'Failed to delete task',
  }),
};

/**
 * Hook for managing optimistic task updates
 */
export function useOptimisticTask<T extends { id: string | number }>(initialTask: T) {
  const optimisticState = useOptimisticState(initialTask);

  const actions = React.useMemo(
    () => ({
      markAsDone: (serverAction: () => Promise<T>) =>
        optimisticState.executeOptimisticAction(taskOptimisticActions.markAsDone(serverAction)),

      updateStatus: (newStatus: string, serverAction: () => Promise<T>) =>
        optimisticState.executeOptimisticAction(
          taskOptimisticActions.updateStatus(newStatus, serverAction)
        ),

      updateTitle: (newTitle: string, serverAction: () => Promise<T>) =>
        optimisticState.executeOptimisticAction(
          taskOptimisticActions.updateTitle(newTitle, serverAction)
        ),

      updateDescription: (newDescription: string, serverAction: () => Promise<T>) =>
        optimisticState.executeOptimisticAction(
          taskOptimisticActions.updateDescription(newDescription, serverAction)
        ),

      updatePriority: (newPriority: string, serverAction: () => Promise<T>) =>
        optimisticState.executeOptimisticAction(
          taskOptimisticActions.updatePriority(newPriority, serverAction)
        ),

      updateAssignee: (newAssignee: string, serverAction: () => Promise<T>) =>
        optimisticState.executeOptimisticAction(
          taskOptimisticActions.updateAssignee(newAssignee, serverAction)
        ),

      toggleSubtask: (subtaskId: string | number, serverAction: () => Promise<T>) =>
        optimisticState.executeOptimisticAction(
          taskOptimisticActions.toggleSubtask(subtaskId, serverAction)
        ),

      addSubtask: (
        newSubtask: { id: string | number; title: string; completed: boolean },
        serverAction: () => Promise<T>
      ) =>
        optimisticState.executeOptimisticAction(
          taskOptimisticActions.addSubtask(newSubtask, serverAction)
        ),
    }),
    [optimisticState]
  );

  return {
    ...optimisticState,
    actions,
  };
}

/**
 * Visual indicator component for optimistic states
 */
export interface OptimisticIndicatorProps {
  isOptimistic: boolean;
  error?: string;
  className?: string;
  showSpinner?: boolean;
  showErrorIcon?: boolean;
}

export function OptimisticIndicator({
  isOptimistic,
  error,
  className = '',
  showSpinner = true,
  showErrorIcon = true,
}: OptimisticIndicatorProps) {
  if (error && showErrorIcon) {
    return (
      <span
        className={`inline-flex items-center text-destructive ${className}`}
        aria-label="Error occurred"
        title={error}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </span>
    );
  }

  if (isOptimistic && showSpinner) {
    return (
      <span
        className={`inline-flex items-center text-muted-foreground ${className}`}
        aria-label="Saving changes"
      >
        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </span>
    );
  }

  return null;
}

export default {
  useOptimisticState,
  useOptimisticTask,
  taskOptimisticActions,
  OptimisticIndicator,
};
