import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn((url) => {
      if (url === '/billing/admin/overview') {
        return Promise.resolve({
          data: {
            stripe_enabled: true,
            stripe_configured: true,
            webhook_configured: true,
            stripe_price: { amount: 29 },
            mrr_eur: 29,
            arr_eur: 348,
            plan_dist: { free: 1, pro: 1, enterprise: 0 },
            subscribers: [],
          },
        });
      }
      return Promise.resolve({
        data: {
          users: [
            { id: 1, full_name: 'Owner Test', email: 'owner@example.com', plan: 'pro' },
          ],
        },
      });
    }),
    patch: vi.fn().mockResolvedValue({ data: { ok: true } }),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

import SuperAdminPlans from '../pages/superadmin/SuperAdminPlans';

describe('SuperAdminPlans', () => {
  const renderPage = () =>
    render(<MemoryRouter><SuperAdminPlans /></MemoryRouter>);

  it('renders without crashing', () => {
    renderPage();
    expect(document.body).toBeTruthy();
  });

  it('displays all managed plan types', () => {
    renderPage();
    expect(screen.getAllByText('Initiation').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Professionnel').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Entreprise').length).toBeGreaterThan(0);
  });

  it('shows live billing KPIs', async () => {
    renderPage();
    expect(await screen.findByText('29 €')).toBeInTheDocument();
    expect(screen.getByText('348 €')).toBeInTheDocument();
  });

  it('shows Stripe configuration status', async () => {
    renderPage();
    expect(await screen.findByText('Clé secrète configurée')).toBeInTheDocument();
    expect(screen.getByText(/Prix Pro configuré/)).toBeInTheDocument();
    expect(screen.getByText('Webhook configuré')).toBeInTheDocument();
  });

  it('shows the owner plan management table', async () => {
    renderPage();
    expect(await screen.findByText('owner@example.com')).toBeInTheDocument();
    expect(screen.getByText('Changer plan')).toBeInTheDocument();
  });

  it('shows the plan distribution', () => {
    renderPage();
    expect(screen.getByText('Répartition des plans')).toBeInTheDocument();
  });
});
