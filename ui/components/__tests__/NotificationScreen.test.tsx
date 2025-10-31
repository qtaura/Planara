import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock APIs BEFORE importing the component to ensure mocks are applied
const notifications = [
  {
    id: 1,
    title: 'Welcome',
    message: 'Hello there',
    type: 'info',
    read: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    title: 'Task assigned',
    message: 'You have a task',
    type: 'task',
    read: true,
    createdAt: new Date().toISOString(),
  },
];

vi.mock('@lib/api', () => ({
  getNotifications: async () => notifications,
  markNotificationAsRead: async () => ({}),
  markAllNotificationsAsRead: async () => ({}),
  deleteNotification: async () => ({}),
  acceptTeamInvite: async () => ({}),
  markNotificationAsUnread: async () => ({}),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import NotificationScreen from '../NotificationScreen';


describe('NotificationScreen', () => {
  it('renders notifications and filters unread', async () => {
    render(<NotificationScreen />);

    // Wait for list to load after async fetch
    expect(await screen.findByText('Welcome')).toBeInTheDocument();
    expect(screen.getByText('Task assigned')).toBeInTheDocument();

    // Toggle unread-only
    fireEvent.click(screen.getByText('Unread only'));
    // Ensure the unread item remains visible
    expect(await screen.findByText('Welcome')).toBeInTheDocument();
  });
});