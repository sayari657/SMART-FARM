import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { username: 'superadmin', role: 'superadmin' },
    logout: vi.fn(),
  }),
}));

import SuperAdminLayout from '../layouts/SuperAdminLayout';

describe('SuperAdminLayout', () => {
  const renderLayout = () =>
    render(
      <MemoryRouter initialEntries={['/superadmin']}>
        <Routes>
          <Route path="/superadmin" element={<SuperAdminLayout />}>
            <Route index element={<div>Dashboard Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

  it('renders without crashing', () => {
    renderLayout();
    expect(document.body).toBeTruthy();
  });

  it('shows SUPERADMIN or SMART FARM branding', () => {
    renderLayout();
    const body = document.body.textContent;
    expect(body).toMatch(/SUPERADMIN|SMART FARM/i);
  });

  it('shows Dashboard nav link', () => {
    renderLayout();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('shows Tenants nav link', () => {
    renderLayout();
    expect(screen.getByText('Tenants')).toBeInTheDocument();
  });

  it('shows Utilisateurs nav link', () => {
    renderLayout();
    expect(screen.getByText(/Utilisateurs/i)).toBeInTheDocument();
  });

  it('shows logout button', () => {
    renderLayout();
    expect(screen.getByText(/Déconnexion/i)).toBeInTheDocument();
  });

  it('renders outlet content', () => {
    renderLayout();
    expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
  });
});
