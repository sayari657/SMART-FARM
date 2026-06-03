import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NotFound from '../pages/NotFound';

describe('NotFound page', () => {
  const renderPage = () =>
    render(<MemoryRouter><NotFound /></MemoryRouter>);

  it('renders without crashing', () => {
    renderPage();
    // Should render some content
    expect(document.body).toBeTruthy();
  });

  it('contains 404 or not found text', () => {
    renderPage();
    const body = document.body.textContent.toLowerCase();
    expect(body.includes('404') || body.includes('not found') || body.includes('introuvable')).toBe(true);
  });
});
