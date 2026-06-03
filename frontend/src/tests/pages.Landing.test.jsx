import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Landing from '../pages/Landing';

describe('Landing Page', () => {
  const renderPage = () => render(<MemoryRouter><Landing /></MemoryRouter>);

  it('renders without crashing', () => {
    renderPage();
    expect(document.body).toBeTruthy();
  });

  it('shows Smart Farm AI brand name', () => {
    renderPage();
    expect(screen.getAllByText(/SMART FARM AI/i).length).toBeGreaterThan(0);
  });

  it('shows pricing section with 3 plans', () => {
    renderPage();
    expect(screen.getByText('Initiation')).toBeInTheDocument();
    expect(screen.getByText('Professionnel')).toBeInTheDocument();
    expect(screen.getByText('Entreprise')).toBeInTheDocument();
  });

  it('has connexion link', () => {
    renderPage();
    const links = screen.getAllByText(/Connexion/i);
    expect(links.length).toBeGreaterThan(0);
  });

  it('has commencer / register CTA', () => {
    renderPage();
    const cta = screen.getAllByText(/Commencer|Register/i);
    expect(cta.length).toBeGreaterThan(0);
  });

  it('shows features section', () => {
    renderPage();
    expect(document.getElementById('features')).toBeTruthy();
  });

  it('shows pricing section', () => {
    renderPage();
    expect(document.getElementById('pricing')).toBeTruthy();
  });
});
