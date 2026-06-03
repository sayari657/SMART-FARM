import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({
      data: {
        models: [
          { name: 'BeeDetection_OBB', version: '1', stage: 'Production', run_id: 'abc123', created_at: new Date().toISOString() },
          { name: 'FireSmoke_Detection', version: '1', stage: 'Production', run_id: 'def456', created_at: new Date().toISOString() },
        ],
        experiments: [
          { id: '1', name: 'SmartFarm_Animal_Detection', status: 'active' },
          { id: '2', name: 'SmartFarm_Plant_Detection', status: 'active' },
        ],
        recent_runs: [],
        total_models: 2,
        total_experiments: 2,
      },
    }),
  },
}));

import SuperAdminModels from '../pages/superadmin/SuperAdminModels';

describe('SuperAdminModels', () => {
  it('renders without crashing', () => {
    render(<MemoryRouter><SuperAdminModels /></MemoryRouter>);
    expect(document.body).toBeTruthy();
  });

  it('shows Modèles AI title', () => {
    render(<MemoryRouter><SuperAdminModels /></MemoryRouter>);
    expect(screen.getByText(/Modèles AI/i)).toBeInTheDocument();
  });

  it('shows MLflow or models reference', () => {
    render(<MemoryRouter><SuperAdminModels /></MemoryRouter>);
    const body = document.body.textContent;
    expect(body).toMatch(/MLflow|Modèle|model/i);
  });
});
