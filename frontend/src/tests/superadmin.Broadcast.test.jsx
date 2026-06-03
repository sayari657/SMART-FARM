import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { items: [], total: 0 } }),
    post: vi.fn().mockResolvedValue({ data: { ok: true, id: 1 } }),
    delete: vi.fn().mockResolvedValue({ data: { ok: true } }),
  },
}));

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import SuperAdminBroadcast from '../pages/superadmin/SuperAdminBroadcast';

describe('SuperAdminBroadcast', () => {
  it('renders without crashing', () => {
    render(<MemoryRouter><SuperAdminBroadcast /></MemoryRouter>);
    expect(document.body).toBeTruthy();
  });

  it('shows Broadcast title', () => {
    render(<MemoryRouter><SuperAdminBroadcast /></MemoryRouter>);
    expect(screen.getByText('Broadcast')).toBeInTheDocument();
  });

  it('shows recipient options', () => {
    render(<MemoryRouter><SuperAdminBroadcast /></MemoryRouter>);
    const body = document.body.textContent;
    // At least one recipient type shown
    expect(body).toMatch(/Tous|Owner|Ouvrier|all/i);
  });

  it('shows send button', () => {
    render(<MemoryRouter><SuperAdminBroadcast /></MemoryRouter>);
    expect(screen.getByText(/Diffuser/i)).toBeInTheDocument();
  });

  it('shows history section', () => {
    render(<MemoryRouter><SuperAdminBroadcast /></MemoryRouter>);
    expect(screen.getByText(/Historique/i)).toBeInTheDocument();
  });

  it('shows empty state when no broadcasts', () => {
    render(<MemoryRouter><SuperAdminBroadcast /></MemoryRouter>);
    expect(screen.getByText(/Aucun broadcast/i)).toBeInTheDocument();
  });
});
