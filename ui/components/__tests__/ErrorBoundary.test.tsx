import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from '../ErrorBoundary';
import * as Sonner from 'sonner';

function Bomb() {
  throw new Error('Boom');
}

describe('ErrorBoundary', () => {
  it('renders fallback UI and triggers error toast on child error', () => {
    vi.spyOn(Sonner, 'toast', 'get').mockReturnValue({
      error: vi.fn(),
      success: vi.fn(),
      loading: vi.fn(),
      dismiss: vi.fn(),
    } as any);

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Something went wrong/i)).toBeTruthy();
  });
});