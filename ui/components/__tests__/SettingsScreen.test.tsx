import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsScreen } from '../SettingsScreen';

vi.mock('@lib/api', () => ({
  getCurrentUser: () => ({ id: 1, username: 'alex', email: 'alex@example.com' }),
  getCurrentUserFromAPI: async () => ({ id: 1, username: 'alex', email: 'alex@example.com' }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('SettingsScreen', () => {
  it('renders header and navigates to Notifications section', () => {
    render(<SettingsScreen />);

    // Header exists
    expect(screen.getByText('Settings')).toBeInTheDocument();

    // Navigate to Notifications via button role
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    expect(screen.getByText('Email notifications')).toBeInTheDocument();
  });
});
