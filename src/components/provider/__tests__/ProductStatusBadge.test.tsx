import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { ProductStatusBadge } from '../ProductStatusBadge';

describe('ProductStatusBadge', () => {
  it('renders available status with correct styling', () => {
    const { container } = render(<ProductStatusBadge status="available" />);

    expect(screen.getByText('Available')).toBeInTheDocument();

    const badge = container.querySelector('.bg-green-500\\/10');
    expect(badge).toBeInTheDocument();
  });

  it('renders reserved status with correct styling', () => {
    const { container } = render(<ProductStatusBadge status="reserved" />);

    expect(screen.getByText('Reserved')).toBeInTheDocument();

    const badge = container.querySelector('.bg-yellow-500\\/10');
    expect(badge).toBeInTheDocument();
  });

  it('renders sold status with correct styling', () => {
    const { container } = render(<ProductStatusBadge status="sold" />);

    expect(screen.getByText('Sold')).toBeInTheDocument();

    const badge = container.querySelector('.bg-gray-500\\/10');
    expect(badge).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <ProductStatusBadge status="available" className="custom-class" />
    );

    const badge = container.querySelector('.custom-class');
    expect(badge).toBeInTheDocument();
  });
});
