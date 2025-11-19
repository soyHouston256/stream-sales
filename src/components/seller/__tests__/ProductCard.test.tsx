import { render, screen, fireEvent } from '@testing-library/react';
import { ProductCard } from '../ProductCard';
import { MarketplaceProduct } from '@/types/seller';

const mockProduct: MarketplaceProduct = {
  id: '1',
  providerId: 'provider-1',
  providerName: 'Test Provider',
  category: 'netflix',
  name: 'Netflix Premium Account',
  description: 'Netflix premium account with 4K streaming and 4 screens',
  price: '15.99',
  status: 'available',
  createdAt: '2024-01-01T00:00:00Z',
};

describe('ProductCard', () => {
  it('renders product information correctly', () => {
    const onBuyClick = jest.fn();

    render(<ProductCard product={mockProduct} onBuyClick={onBuyClick} />);

    expect(screen.getByText('Netflix Premium Account')).toBeInTheDocument();
    expect(screen.getByText(/Test Provider/i)).toBeInTheDocument();
    expect(screen.getByText('$15.99')).toBeInTheDocument();
  });

  it('truncates long descriptions', () => {
    const longDescProduct = {
      ...mockProduct,
      description:
        'This is a very long description that should be truncated to fit within the card. It contains a lot of text that exceeds the maximum length allowed for display.',
    };
    const onBuyClick = jest.fn();

    render(<ProductCard product={longDescProduct} onBuyClick={onBuyClick} />);

    const description = screen.getByText(/This is a very long description/);
    expect(description.textContent).toContain('...');
  });

  it('calls onBuyClick when Buy Now button is clicked', () => {
    const onBuyClick = jest.fn();

    render(<ProductCard product={mockProduct} onBuyClick={onBuyClick} />);

    const buyButton = screen.getByRole('button', { name: /Buy Now/i });
    fireEvent.click(buyButton);

    expect(onBuyClick).toHaveBeenCalledWith(mockProduct);
    expect(onBuyClick).toHaveBeenCalledTimes(1);
  });

  it('renders all product details', () => {
    const onBuyClick = jest.fn();

    render(<ProductCard product={mockProduct} onBuyClick={onBuyClick} />);

    // Check that key elements are rendered
    expect(screen.getByText('Netflix Premium Account')).toBeInTheDocument();
    expect(screen.getByText(/Test Provider/i)).toBeInTheDocument();
    expect(screen.getByText('$15.99')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Buy Now/i })).toBeInTheDocument();
  });
});
