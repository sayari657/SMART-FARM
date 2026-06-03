import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: {
      owners: 5, workers: 12, farms: 8, animals: 234,
      active_users: 17, inactive_users: 0,
      plan_dist: { free: 3, pro: 2 },
      mrr_eur: 58, arr_eur: 696,
      new_this_month: 1, new_this_week: 0,
      pwa_version: '3.0.0', maintenance_mode: false,
    }}),
  },
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  BarChart: ({ children }) => <div>{children}</div>,
  Bar: () => <div />, XAxis: () => <div />, YAxis: () => <div />,
  Tooltip: () => <div />, PieChart: ({ children }) => <div>{children}</div>,
  Pie: () => <div />, Cell: () => <div />,
  LineChart: ({ children }) => <div>{children}</div>,
  Line: () => <div />, CartesianGrid: () => <div />,
}));

import SuperAdminDashboard from '../pages/superadmin/SuperAdminDashboard';

describe('SuperAdminDashboard', () => {
  it('renders without crashing', () => {
    render(<MemoryRouter><SuperAdminDashboard /></MemoryRouter>);
    expect(document.body).toBeTruthy();
  });

  it('shows platform dashboard title', () => {
    render(<MemoryRouter><SuperAdminDashboard /></MemoryRouter>);
    expect(screen.getByText(/Tableau de bord Plateforme/i)).toBeInTheDocument();
  });

  it('shows KPI labels', () => {
    render(<MemoryRouter><SuperAdminDashboard /></MemoryRouter>);
    const body = document.body.textContent;
    expect(body).toMatch(/Propriétaires|Owners|owners/i);
    expect(body).toMatch(/MRR|mrr/i);
  });

  it('has refresh button', () => {
    render(<MemoryRouter><SuperAdminDashboard /></MemoryRouter>);
    expect(screen.getByText(/Actualiser/i)).toBeInTheDocument();
  });
});
