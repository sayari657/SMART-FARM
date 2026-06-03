import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock the API
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: {
      cv_monitoring: true, ai_recommendations: true,
      pwa_worker_app: true, maintenance_mode: false,
      bee_module: true, poultry_module: true, plantation_module: true,
      telemetry_realtime: true, export_pdf: true, export_excel: true,
      map_center: true, sovereign_assistant: true,
    }}),
    put: vi.fn().mockResolvedValue({ data: { flags: {} } }),
  },
}));

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import SuperAdminFlags from '../pages/superadmin/SuperAdminFlags';

describe('SuperAdminFlags', () => {
  it('renders without crashing', () => {
    render(<MemoryRouter><SuperAdminFlags /></MemoryRouter>);
    expect(document.body).toBeTruthy();
  });

  it('shows Feature Flags title', () => {
    render(<MemoryRouter><SuperAdminFlags /></MemoryRouter>);
    expect(screen.getByText('Feature Flags')).toBeInTheDocument();
  });

  it('shows save button', () => {
    render(<MemoryRouter><SuperAdminFlags /></MemoryRouter>);
    expect(screen.getByText(/Sauvegarder/)).toBeInTheDocument();
  });
});
