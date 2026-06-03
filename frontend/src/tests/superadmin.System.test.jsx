import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn().mockImplementation((url) => {
      if (url.includes('health')) return Promise.resolve({ data: { database: 'ok', api: 'ok', pwa_version: '3.0.0', server_time: new Date().toISOString(), maintenance_mode: false, db_size_mb: 12.5, total_audit_logs: 42 } });
      if (url.includes('pwa/version')) return Promise.resolve({ data: { version: '3.0.0', force: false, changelog: 'Initial', updated_at: new Date().toISOString() } });
      return Promise.resolve({ data: {} });
    }),
    post: vi.fn().mockResolvedValue({ data: new Blob() }),
  },
}));

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import SuperAdminSystem from '../pages/superadmin/SuperAdminSystem';

describe('SuperAdminSystem', () => {
  it('renders without crashing', () => {
    render(<MemoryRouter><SuperAdminSystem /></MemoryRouter>);
    expect(document.body).toBeTruthy();
  });

  it('shows system maintenance title', () => {
    render(<MemoryRouter><SuperAdminSystem /></MemoryRouter>);
    expect(screen.getByText(/Système|Maintenance/i)).toBeInTheDocument();
  });

  it('shows PWA or version section', () => {
    render(<MemoryRouter><SuperAdminSystem /></MemoryRouter>);
    const body = document.body.textContent;
    expect(body).toMatch(/PWA|version|Version/i);
  });

  it('shows deploy or action button', () => {
    render(<MemoryRouter><SuperAdminSystem /></MemoryRouter>);
    const body = document.body.textContent;
    expect(body).toMatch(/Déployer|Deploy|backup|Backup|Télécharger/i);
  });

  it('shows database section', () => {
    render(<MemoryRouter><SuperAdminSystem /></MemoryRouter>);
    const body = document.body.textContent;
    expect(body).toMatch(/base de données|Database|backup|sauvegarde/i);
  });
});
