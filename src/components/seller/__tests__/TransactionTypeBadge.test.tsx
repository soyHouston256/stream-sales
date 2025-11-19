import { render, screen } from '@testing-library/react';
import { TransactionTypeBadge } from '../TransactionTypeBadge';

describe('TransactionTypeBadge', () => {
  it('renders credit badge with correct text', () => {
    render(<TransactionTypeBadge type="credit" />);
    expect(screen.getByText('Credit')).toBeInTheDocument();
  });

  it('renders debit badge with correct text', () => {
    render(<TransactionTypeBadge type="debit" />);
    expect(screen.getByText('Debit')).toBeInTheDocument();
  });

  it('renders transfer badge with correct text', () => {
    render(<TransactionTypeBadge type="transfer" />);
    expect(screen.getByText('Transfer')).toBeInTheDocument();
  });

  it('includes the appropriate icon for each type', () => {
    const { container: creditContainer } = render(<TransactionTypeBadge type="credit" />);
    expect(creditContainer.querySelector('svg')).toBeInTheDocument();

    const { container: debitContainer } = render(<TransactionTypeBadge type="debit" />);
    expect(debitContainer.querySelector('svg')).toBeInTheDocument();

    const { container: transferContainer } = render(<TransactionTypeBadge type="transfer" />);
    expect(transferContainer.querySelector('svg')).toBeInTheDocument();
  });

  it('applies custom className when provided', () => {
    const { container } = render(
      <TransactionTypeBadge type="credit" className="custom-class" />
    );

    const badge = container.querySelector('.custom-class');
    expect(badge).toBeInTheDocument();
  });
});
