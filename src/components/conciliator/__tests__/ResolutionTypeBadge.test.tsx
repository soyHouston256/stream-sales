import { render, screen } from '@testing-library/react';
import { ResolutionTypeBadge } from '../ResolutionTypeBadge';

describe('ResolutionTypeBadge', () => {
  it('should render refund_seller type correctly', () => {
    render(<ResolutionTypeBadge resolutionType="refund_seller" />);
    expect(screen.getByText('Refund Seller')).toBeInTheDocument();
  });

  it('should render favor_provider type correctly', () => {
    render(<ResolutionTypeBadge resolutionType="favor_provider" />);
    expect(screen.getByText('Favor Provider')).toBeInTheDocument();
  });

  it('should render partial_refund type correctly', () => {
    render(<ResolutionTypeBadge resolutionType="partial_refund" />);
    expect(screen.getByText('Partial Refund')).toBeInTheDocument();
  });

  it('should render partial_refund with percentage', () => {
    render(<ResolutionTypeBadge resolutionType="partial_refund" partialRefundPercentage={60} />);
    expect(screen.getByText('Partial Refund (60%)')).toBeInTheDocument();
  });

  it('should render no_action type correctly', () => {
    render(<ResolutionTypeBadge resolutionType="no_action" />);
    expect(screen.getByText('No Action')).toBeInTheDocument();
  });

  it('should apply correct styling for refund_seller', () => {
    const { container } = render(<ResolutionTypeBadge resolutionType="refund_seller" />);
    const badge = screen.getByText('Refund Seller').closest('div');
    expect(badge).toHaveClass('bg-red-100');
  });

  it('should apply correct styling for favor_provider', () => {
    const { container } = render(<ResolutionTypeBadge resolutionType="favor_provider" />);
    const badge = screen.getByText('Favor Provider').closest('div');
    expect(badge).toHaveClass('bg-green-100');
  });

  it('should apply correct styling for partial_refund', () => {
    const { container } = render(<ResolutionTypeBadge resolutionType="partial_refund" />);
    const badge = screen.getByText('Partial Refund').closest('div');
    expect(badge).toHaveClass('bg-blue-100');
  });

  it('should apply correct styling for no_action', () => {
    const { container } = render(<ResolutionTypeBadge resolutionType="no_action" />);
    const badge = screen.getByText('No Action').closest('div');
    expect(badge).toHaveClass('bg-gray-100');
  });
});
