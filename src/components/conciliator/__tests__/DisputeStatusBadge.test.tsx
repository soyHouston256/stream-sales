import { render, screen } from '@testing-library/react';
import { DisputeStatusBadge } from '../DisputeStatusBadge';

describe('DisputeStatusBadge', () => {
  it('should render open status correctly', () => {
    render(<DisputeStatusBadge status="open" />);
    expect(screen.getByText('Open')).toBeInTheDocument();
  });

  it('should render under_review status correctly', () => {
    render(<DisputeStatusBadge status="under_review" />);
    expect(screen.getByText('Under Review')).toBeInTheDocument();
  });

  it('should render resolved status correctly', () => {
    render(<DisputeStatusBadge status="resolved" />);
    expect(screen.getByText('Resolved')).toBeInTheDocument();
  });

  it('should render closed status correctly', () => {
    render(<DisputeStatusBadge status="closed" />);
    expect(screen.getByText('Closed')).toBeInTheDocument();
  });

  it('should apply correct styling for open status', () => {
    const { container } = render(<DisputeStatusBadge status="open" />);
    const badge = screen.getByText('Open').closest('div');
    expect(badge).toHaveClass('bg-yellow-100');
  });

  it('should apply correct styling for under_review status', () => {
    const { container } = render(<DisputeStatusBadge status="under_review" />);
    const badge = screen.getByText('Under Review').closest('div');
    expect(badge).toHaveClass('bg-blue-100');
  });

  it('should apply correct styling for resolved status', () => {
    const { container } = render(<DisputeStatusBadge status="resolved" />);
    const badge = screen.getByText('Resolved').closest('div');
    expect(badge).toHaveClass('bg-green-100');
  });

  it('should apply correct styling for closed status', () => {
    const { container } = render(<DisputeStatusBadge status="closed" />);
    const badge = screen.getByText('Closed').closest('div');
    expect(badge).toHaveClass('bg-gray-100');
  });
});
