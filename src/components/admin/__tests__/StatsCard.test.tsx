import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { StatsCard } from '../StatsCard';
import { Users } from 'lucide-react';

describe('StatsCard', () => {
  it('renders with basic props', () => {
    render(
      <StatsCard
        title="Total Users"
        value={1234}
        icon={Users}
      />
    );

    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('1234')).toBeInTheDocument();
  });

  it('renders with description', () => {
    render(
      <StatsCard
        title="Total Users"
        value={1234}
        icon={Users}
        description="Active users this month"
      />
    );

    expect(screen.getByText('Active users this month')).toBeInTheDocument();
  });

  it('renders positive trend', () => {
    render(
      <StatsCard
        title="Total Users"
        value={1234}
        icon={Users}
        trend={{ value: 12.5, isPositive: true }}
      />
    );

    expect(screen.getByText('+12.5% vs mes anterior')).toBeInTheDocument();
  });

  it('renders negative trend', () => {
    render(
      <StatsCard
        title="Total Users"
        value={1234}
        icon={Users}
        trend={{ value: -5.2, isPositive: false }}
      />
    );

    expect(screen.getByText('-5.2% vs mes anterior')).toBeInTheDocument();
  });

  it('shows loading skeleton when isLoading is true', () => {
    const { container } = render(
      <StatsCard
        title="Total Users"
        value={1234}
        icon={Users}
        isLoading={true}
      />
    );

    // Check for skeleton elements (they have animate-pulse class)
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('handles string values', () => {
    render(
      <StatsCard
        title="Revenue"
        value="$45,231"
        icon={Users}
      />
    );

    expect(screen.getByText('$45,231')).toBeInTheDocument();
  });
});
