import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmailVerificationScreen } from '../EmailVerificationScreen';
import { ThemeProvider } from '../../lib/theme-context';

vi.mock('@lib/api', () => {
  return {
    sendVerificationCode: vi.fn(async () => ({
      expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
      devCode: '123456',
    })),
    verifyEmailCode: vi.fn(async () => ({ success: true })),
    getVerificationStatus: vi.fn(async () => ({ verified: true })),
    getCurrentUser: vi.fn(() => ({ id: 'u1', email: 'test@example.com', isVerified: false })),
    setCurrentUser: vi.fn(() => {}),
  };
});

const api = await import('@lib/api');

function getOtpCells() {
  // Target only the OTP inputs with their aria-labels
  return screen.getAllByLabelText(/Digit \d+ of 6/i);
}

describe('EmailVerificationScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('auto-sends verification code on mount when email provided', async () => {
    render(
      <ThemeProvider>
        <EmailVerificationScreen
          email="test@example.com"
          onVerified={() => {}}
          onCancel={() => {}}
        />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(api.sendVerificationCode).toHaveBeenCalledWith('test@example.com');
    });

    // Resend is initially disabled due to cooldown
    const resendBtn = screen.getByRole('button', { name: /resend/i });
    expect(resendBtn).toBeDisabled();
  });

  it('shows error when verification fails', async () => {
    (api.verifyEmailCode as any).mockResolvedValueOnce({ success: false });

    const onVerified = vi.fn();
    render(
      <ThemeProvider>
        <EmailVerificationScreen
          email="test@example.com"
          onVerified={onVerified}
          onCancel={() => {}}
        />
      </ThemeProvider>
    );

    const cells = getOtpCells();
    const user = userEvent.setup();
    await user.click(cells[0]);
    await user.paste('000000');

    const verifyBtn = screen.getByRole('button', { name: /verify/i });
    await user.click(verifyBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/invalid verification code/i);
    });
    expect(onVerified).not.toHaveBeenCalled();
  });

  it('calls onVerified on successful verification', async () => {
    const onVerified = vi.fn();
    render(
      <ThemeProvider>
        <EmailVerificationScreen
          email="test@example.com"
          onVerified={onVerified}
          onCancel={() => {}}
        />
      </ThemeProvider>
    );

    const cells = getOtpCells();
    const user = userEvent.setup();
    await user.click(cells[0]);
    await user.paste('123456');

    const verifyBtn = screen.getByRole('button', { name: /verify/i });
    await user.click(verifyBtn);

    await waitFor(() => {
      expect(onVerified).toHaveBeenCalled();
    });
  });
});
