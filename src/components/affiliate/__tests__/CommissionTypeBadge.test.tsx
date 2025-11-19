/**
 * Tests for CommissionTypeBadge component
 */

import { render, screen } from '@testing-library/react';
import { CommissionTypeBadge } from '../CommissionTypeBadge';

describe('CommissionTypeBadge', () => {
  it('should render registration badge with correct styling', () => {
    render(<CommissionTypeBadge type="registration" />);
    const badge = screen.getByText('Registration');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-blue-100');
  });

  it('should render sale badge with correct styling', () => {
    render(<CommissionTypeBadge type="sale" />);
    const badge = screen.getByText('Sale');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-green-100');
  });

  it('should render bonus badge with correct styling', () => {
    render(<CommissionTypeBadge type="bonus" />);
    const badge = screen.getByText('Bonus');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-purple-100');
  });
});
