import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ farmId: 1, user: { role: 'owner' } }),
}));

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn().mockResolvedValue({ data: { ok: true } }),
    delete: vi.fn().mockResolvedValue({ data: { ok: true } }),
  },
}));

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import IoTDevices from '../pages/IoTDevices';

describe('IoTDevices page', () => {
  it('renders without crashing', () => {
    render(<MemoryRouter><IoTDevices /></MemoryRouter>);
    expect(document.body).toBeTruthy();
  });

  it('shows Capteurs IoT title', () => {
    render(<MemoryRouter><IoTDevices /></MemoryRouter>);
    expect(screen.getByText('Capteurs IoT')).toBeInTheDocument();
  });

  it('shows add device button', () => {
    render(<MemoryRouter><IoTDevices /></MemoryRouter>);
    expect(screen.getByText(/Ajouter capteur/i)).toBeInTheDocument();
  });

  it('shows type filter buttons', () => {
    render(<MemoryRouter><IoTDevices /></MemoryRouter>);
    expect(screen.getByText('Tous')).toBeInTheDocument();
  });

  it('opens modal when add button clicked', () => {
    render(<MemoryRouter><IoTDevices /></MemoryRouter>);
    fireEvent.click(screen.getByText(/Ajouter capteur/i));
    expect(screen.getByText(/Ajouter capteur IoT/i)).toBeInTheDocument();
  });

  it('modal has sensor type selector', () => {
    render(<MemoryRouter><IoTDevices /></MemoryRouter>);
    fireEvent.click(screen.getByText(/Ajouter capteur/i));
    const select = document.querySelector('select');
    expect(select).toBeTruthy();
  });
});
