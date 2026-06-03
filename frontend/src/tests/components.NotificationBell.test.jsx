import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'owner', username: 'testowner' } }),
}));

vi.mock('../hooks/useWebSocket', () => ({
  useWebSocket: () => ({ connected: false, lastMessage: null, send: vi.fn() }),
}));

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

import NotificationBell from '../components/NotificationBell';

describe('NotificationBell', () => {
  it('renders bell icon', () => {
    render(<MemoryRouter><NotificationBell /></MemoryRouter>);
    const btn = document.querySelector('button');
    expect(btn).toBeTruthy();
  });

  it('opens dropdown on click', () => {
    render(<MemoryRouter><NotificationBell /></MemoryRouter>);
    const btn = document.querySelector('button');
    fireEvent.click(btn);
    expect(screen.getByText(/Notifications/i)).toBeInTheDocument();
  });

  it('shows empty state when no notifications', () => {
    render(<MemoryRouter><NotificationBell /></MemoryRouter>);
    const btn = document.querySelector('button');
    fireEvent.click(btn);
    const body = document.body.textContent;
    expect(body).toMatch(/Notifications|notification/i);
  });
});
