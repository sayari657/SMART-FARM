import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({
      data: {
        total: 3,
        logs: [
          { id: 1, action: 'plan_update',  admin: 'superadmin', target_id: 5, detail: { old: 'free', new: 'pro' }, ip_address: '127.0.0.1', created_at: new Date().toISOString() },
          { id: 2, action: 'user_create',  admin: 'superadmin', target_id: 6, detail: { username: 'newuser' }, ip_address: '127.0.0.1', created_at: new Date().toISOString() },
          { id: 3, action: 'pwa_version_push', admin: 'superadmin', target_id: null, detail: { version: '3.1.0' }, ip_address: '192.168.1.1', created_at: new Date().toISOString() },
        ],
      },
    }),
  },
}));

import SuperAdminAudit from '../pages/superadmin/SuperAdminAudit';

describe('SuperAdminAudit', () => {
  it('renders without crashing', () => {
    render(<MemoryRouter><SuperAdminAudit /></MemoryRouter>);
    expect(document.body).toBeTruthy();
  });

  it('shows Audit Log title', () => {
    render(<MemoryRouter><SuperAdminAudit /></MemoryRouter>);
    expect(screen.getByText('Audit Log')).toBeInTheDocument();
  });

  it('has search input', () => {
    render(<MemoryRouter><SuperAdminAudit /></MemoryRouter>);
    expect(document.querySelector('input[placeholder*="Filtrer"]')).toBeTruthy();
  });

  it('has action filter dropdown', () => {
    render(<MemoryRouter><SuperAdminAudit /></MemoryRouter>);
    expect(document.querySelector('select')).toBeTruthy();
  });
});
