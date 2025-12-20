import { render, screen, fireEvent } from '@testing-library/react';
import { ProductCard } from '../ProductCard';
import { MarketplaceProduct } from '@/types/seller';
import { LanguageProvider } from '@/contexts/LanguageContext';

// Mock translation files
jest.mock('@/locales/es.json', () => ({
  seller: {
    marketplace: {
      buyNow: 'Comprar Ahora',
      by: 'por',
    },
  },
}), { virtual: true });

jest.mock('@/locales/en.json', () => ({
  seller: {
    marketplace: {
      buyNow: 'Buy Now',
      by: 'by',
    },
  },
}), { virtual: true });

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    // eslint-disable-next-line security/detect-object-injection
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      // eslint-disable-next-line security/detect-object-injection
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Test wrapper with LanguageProvider
const renderWithProviders = (ui: React.ReactElement) => {
  return render(<LanguageProvider>{ui}</LanguageProvider>);
};

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
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('renders product information correctly', () => {
    const onBuyClick = jest.fn();

    renderWithProviders(<ProductCard product={mockProduct} onBuyClick={onBuyClick} />);

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

    renderWithProviders(<ProductCard product={longDescProduct} onBuyClick={onBuyClick} />);

    const description = screen.getByText(/This is a very long description/);
    expect(description.textContent).toContain('...');
  });

  it('calls onBuyClick when Buy Now button is clicked', () => {
    const onBuyClick = jest.fn();

    renderWithProviders(<ProductCard product={mockProduct} onBuyClick={onBuyClick} />);

    // Find button by its text content (translation key or translated text)
    const buyButton = screen.getByRole('button', { name: /buyNow|Buy Now/i });
    fireEvent.click(buyButton);

    expect(onBuyClick).toHaveBeenCalledWith(mockProduct);
    expect(onBuyClick).toHaveBeenCalledTimes(1);
  });

  it('renders all product details', () => {
    const onBuyClick = jest.fn();

    renderWithProviders(<ProductCard product={mockProduct} onBuyClick={onBuyClick} />);

    // Check that key elements are rendered
    expect(screen.getByText('Netflix Premium Account')).toBeInTheDocument();
    expect(screen.getByText(/Test Provider/i)).toBeInTheDocument();
    expect(screen.getByText('$15.99')).toBeInTheDocument();
    // Find button by its text content (translation key or translated text)
    expect(screen.getByRole('button', { name: /buyNow|Buy Now/i })).toBeInTheDocument();
  });
});

