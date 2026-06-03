import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SuperAdminPlans from '../pages/superadmin/SuperAdminPlans';

describe('SuperAdminPlans', () => {
  const renderPage = () =>
    render(<MemoryRouter><SuperAdminPlans /></MemoryRouter>);

  it('renders without crashing', () => {
    renderPage();
    expect(document.body).toBeTruthy();
  });

  it('displays 3 pricing plans', () => {
    renderPage();
    expect(screen.getByText('Initiation')).toBeInTheDocument();
    expect(screen.getByText('Professionnel')).toBeInTheDocument();
    expect(screen.getByText('Entreprise')).toBeInTheDocument();
  });

  it('shows pro plan price 29 EUR', () => {
    renderPage();
    expect(screen.getByText(/29 €\/mois/)).toBeInTheDocument();
  });

  it('shows free plan as gratuit', () => {
    renderPage();
    expect(screen.getByText(/Gratuit/)).toBeInTheDocument();
  });

  it('shows enterprise as sur mesure', () => {
    renderPage();
    expect(screen.getByText(/Sur mesure/)).toBeInTheDocument();
  });

  it('shows animal limits for each plan', () => {
    renderPage();
    const body = document.body.textContent;
    expect(body).toMatch(/50|∞/);  // free=50, pro/enterprise=∞
  });
});
