/**
 * Tests for ReferralStatusBadge component
 */

import { render, screen } from '@testing-library/react';
import { ReferralStatusBadge } from '../ReferralStatusBadge';

describe('ReferralStatusBadge', () => {
  it('should render active badge with green styling', () => {
    render(<ReferralStatusBadge status="active" />);
    const badge = screen.getByText('Active');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-green-100');
  });

  it('should render inactive badge with gray styling', () => {
    render(<ReferralStatusBadge status="inactive" />);
    const badge = screen.getByText('Inactive');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-gray-100');
  });

  it('should render suspended badge with red styling', () => {
    render(<ReferralStatusBadge status="suspended" />);
    const badge = screen.getByText('Suspended');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-red-100');
  });
});
