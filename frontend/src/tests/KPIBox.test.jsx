import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import KPIBox from '../components/KPIBox';

const FakeIcon = () => <svg data-testid="icon" />;

describe('KPIBox', () => {
  it('renders value and label', () => {
    render(<KPIBox icon={FakeIcon} value={42} label="Fermes" />);
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Fermes')).toBeInTheDocument();
  });

  it('renders — when value is null', () => {
    render(<KPIBox icon={FakeIcon} value={null} label="Aucun" />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders unit suffix when provided', () => {
    render(<KPIBox icon={FakeIcon} value={25} label="Temp" unit="°C" />);
    expect(screen.getByText('°C')).toBeInTheDocument();
  });

  it('renders positive change indicator', () => {
    render(<KPIBox icon={FakeIcon} value={10} label="Hausse" change={5} />);
    expect(screen.getByText(/▲.*5%/)).toBeInTheDocument();
  });

  it('renders negative change indicator', () => {
    render(<KPIBox icon={FakeIcon} value={10} label="Baisse" change={-3} />);
    expect(screen.getByText(/▼.*3%/)).toBeInTheDocument();
  });
});
