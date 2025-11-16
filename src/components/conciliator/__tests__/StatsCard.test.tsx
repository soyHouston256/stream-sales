import { render, screen } from '@testing-library/react';
import { CheckCircle } from 'lucide-react';
import { StatsCard } from '../StatsCard';

describe('StatsCard', () => {
  it('should render title and value correctly', () => {
    render(
      <StatsCard
        title="Total Resolved"
        value={42}
        icon={CheckCircle}
      />
    );

    expect(screen.getByText('Total Resolved')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('should render description when provided', () => {
    render(
      <StatsCard
        title="Total Resolved"
        value={42}
        description="All time"
        icon={CheckCircle}
      />
    );

    expect(screen.getByText('All time')).toBeInTheDocument();
  });

  it('should render trend when provided', () => {
    render(
      <StatsCard
        title="Total Resolved"
        value={42}
        icon={CheckCircle}
        trend={{ value: 15, label: 'from last week' }}
      />
    );

    expect(screen.getByText('+15% from last week')).toBeInTheDocument();
  });

  it('should render negative trend correctly', () => {
    render(
      <StatsCard
        title="Total Resolved"
        value={42}
        icon={CheckCircle}
        trend={{ value: -5, label: 'from last week' }}
      />
    );

    expect(screen.getByText('-5% from last week')).toBeInTheDocument();
  });

  it('should render string value correctly', () => {
    render(
      <StatsCard
        title="Avg Time"
        value="2.5h"
        icon={CheckCircle}
      />
    );

    expect(screen.getByText('2.5h')).toBeInTheDocument();
  });
});
