import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const apiMocks = vi.hoisted(() => ({
  getFarm: vi.fn(),
  listAnimals: vi.fn(),
  listAlerts: vi.fn(),
  listOwners: vi.fn(),
  listWorkers: vi.fn(),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'owner', plan: 'free' } }),
}));

vi.mock('../services/api', () => ({
  farmsAPI: { get: apiMocks.getFarm },
  animalsAPI: { list: apiMocks.listAnimals },
  alertsAPI: { list: apiMocks.listAlerts },
  farmOwnersAPI: {
    list: apiMocks.listOwners,
    add: vi.fn(),
    remove: vi.fn(),
  },
  farmWorkersAPI: {
    list: apiMocks.listWorkers,
    add: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock('../components/Navbar', () => ({
  default: ({ title }) => <div data-testid="navbar">{title}</div>,
}));
vi.mock('../components/AnimalCard', () => ({
  default: ({ unit }) => <div>{unit.name}</div>,
}));
vi.mock('../components/AlertCard', () => ({
  default: ({ alert }) => <div>{alert.message}</div>,
}));

import FarmDetails from '../pages/FarmDetails';

describe('FarmDetails page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.listOwners.mockResolvedValue({ data: [] });
    apiMocks.listWorkers.mockResolvedValue({ data: [] });
  });

  it('renders the farm without waiting for slower animals and alerts requests', async () => {
    apiMocks.getFarm.mockResolvedValue({
      data: {
        id: 1,
        name: 'Ferme Rapide',
        status: 'active',
        unit_count: 4,
        active_alerts: 2,
        avg_health_score: 91,
        created_at: '2026-06-08T10:00:00',
      },
    });
    apiMocks.listAnimals.mockReturnValue(new Promise(() => {}));
    apiMocks.listAlerts.mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter initialEntries={['/farms/1']}>
        <Routes>
          <Route path="/farms/:id" element={<FarmDetails />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByTestId('navbar')).toHaveTextContent('Ferme Rapide');
    expect(screen.getByText('4 animaux')).toBeInTheDocument();
    expect(screen.getByText('2 alertes')).toBeInTheDocument();
  });
});
