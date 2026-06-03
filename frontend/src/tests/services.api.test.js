import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock axios before importing api
vi.mock('axios', () => {
  const mockAxios = {
    create: vi.fn(() => mockAxios),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  };
  return { default: mockAxios };
});

describe('API service structure', () => {
  it('recsAPI has required methods', async () => {
    const { recsAPI } = await import('../services/api.js');
    expect(typeof recsAPI.list).toBe('function');
    expect(typeof recsAPI.action).toBe('function');
    expect(typeof recsAPI.generate).toBe('function');
  });

  it('alertsAPI has required methods', async () => {
    const { alertsAPI } = await import('../services/api.js');
    expect(typeof alertsAPI.list).toBe('function');
    expect(typeof alertsAPI.critical).toBe('function');
    expect(typeof alertsAPI.resolve).toBe('function');
  });

  it('dashboardAPI has required methods', async () => {
    const { dashboardAPI } = await import('../services/api.js');
    expect(typeof dashboardAPI.stats).toBe('function');
    expect(typeof dashboardAPI.analytics).toBe('function');
    expect(typeof dashboardAPI.aiInsight).toBe('function');
  });

  it('farmsAPI has required methods', async () => {
    const { farmsAPI } = await import('../services/api.js');
    expect(typeof farmsAPI.list).toBe('function');
    expect(typeof farmsAPI.get).toBe('function');
    expect(typeof farmsAPI.create).toBe('function');
    expect(typeof farmsAPI.update).toBe('function');
    expect(typeof farmsAPI.delete).toBe('function');
  });

  it('animalsAPI has required methods', async () => {
    const { animalsAPI } = await import('../services/api.js');
    expect(typeof animalsAPI.list).toBe('function');
    expect(typeof animalsAPI.get).toBe('function');
    expect(typeof animalsAPI.types).toBe('function');
  });

  it('anomalyAPI has required methods', async () => {
    const { anomalyAPI } = await import('../services/api.js');
    expect(typeof anomalyAPI.recent).toBe('function');
    expect(typeof anomalyAPI.byUnit).toBe('function');
  });

  it('authAPI has required methods', async () => {
    const { authAPI } = await import('../services/api.js');
    expect(typeof authAPI.login).toBe('function');
    expect(typeof authAPI.register).toBe('function');
    expect(typeof authAPI.profile).toBe('function');
    expect(typeof authAPI.workerRequestOtp).toBe('function');
    expect(typeof authAPI.workerVerifyOtp).toBe('function');
  });
});
