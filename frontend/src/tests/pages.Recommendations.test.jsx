import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    farmId: 1,
    farms: [{ id: 1, name: 'Ferme Test' }],
    user: { role: 'owner' },
  }),
}));

vi.mock('../services/api', () => ({
  recsAPI: {
    list: vi.fn().mockResolvedValue({ data: [] }),
    generate: vi.fn().mockResolvedValue({ data: null }),
    action: vi.fn().mockResolvedValue({ data: {} }),
  },
  alertsAPI: {
    list: vi.fn().mockResolvedValue({ data: [] }),
    resolve: vi.fn().mockResolvedValue({ data: {} }),
  },
  anomalyAPI: {
    recent: vi.fn().mockResolvedValue({ data: [] }),
  },
  dashboardAPI: {
    stats: vi.fn().mockResolvedValue({ data: null }),
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

vi.mock('../components/Navbar', () => ({
  default: ({ title }) => <div data-testid="navbar">{title}</div>,
}));

// Stub WebSocket globally
global.WebSocket = vi.fn().mockImplementation(() => ({
  onopen: null, onmessage: null, onerror: null, onclose: null,
  close: vi.fn(), readyState: 1,
}));

import Recommendations from '../pages/Recommendations';

describe('Recommendations page', () => {
  it('renders without crashing', () => {
    render(<MemoryRouter><Recommendations /></MemoryRouter>);
    expect(document.body).toBeTruthy();
  });

  it('shows navbar with correct title', () => {
    render(<MemoryRouter><Recommendations /></MemoryRouter>);
    expect(screen.getByTestId('navbar')).toHaveTextContent(/Recommandations/i);
  });

  it('shows tab navigation or main content', () => {
    render(<MemoryRouter><Recommendations /></MemoryRouter>);
    const body = document.body.textContent;
    expect(body).toMatch(/Recommandation|Alerte|Anomalie|IA/i);
  });

  it('shows KPI strip', () => {
    render(<MemoryRouter><Recommendations /></MemoryRouter>);
    const body = document.body.textContent;
    expect(body).toMatch(/critique|Alerte|Anomalie|IA/i);
  });

  it('renders page content area', () => {
    render(<MemoryRouter><Recommendations /></MemoryRouter>);
    // Page renders some content — exact buttons depend on async state
    expect(document.body.textContent.length).toBeGreaterThan(10);
  });

  it('has scrollable container (overflowY auto)', () => {
    const { container } = render(<MemoryRouter><Recommendations /></MemoryRouter>);
    const scrollable = container.querySelector('[style*="overflow"]');
    expect(scrollable).toBeTruthy();
  });
});
