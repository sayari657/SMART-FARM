import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { totp_enabled: false, user: 'superadmin' } }),
    post: vi.fn().mockResolvedValue({ data: { secret: 'TESTSECRET', qr_code: 'data:image/png;base64,test' } }),
  },
}));

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import SuperAdmin2FA from '../pages/superadmin/SuperAdmin2FA';

describe('SuperAdmin2FA', () => {
  it('renders without crashing', () => {
    render(<MemoryRouter><SuperAdmin2FA /></MemoryRouter>);
    expect(document.body).toBeTruthy();
  });

  it('shows 2FA title', () => {
    render(<MemoryRouter><SuperAdmin2FA /></MemoryRouter>);
    expect(screen.getByText(/2 facteurs|TOTP/i)).toBeInTheDocument();
  });

  it('shows setup button when 2FA disabled', () => {
    render(<MemoryRouter><SuperAdmin2FA /></MemoryRouter>);
    const body = document.body.textContent;
    expect(body).toMatch(/Générer|Configure|Setup|DÉSACTIVÉE/i);
  });
});
