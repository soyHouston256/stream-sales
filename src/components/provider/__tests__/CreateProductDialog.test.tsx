import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateProductDialog } from '../CreateProductDialog';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the toast hook
jest.mock('@/lib/hooks/useToast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'TestWrapper';
  return Wrapper;
};

describe('CreateProductDialog', () => {
  it('renders trigger button by default', () => {
    render(<CreateProductDialog />, { wrapper: createWrapper() });

    expect(screen.getByText('Add Product')).toBeInTheDocument();
  });

  it('opens dialog when trigger is clicked', async () => {
    const user = userEvent.setup();
    render(<CreateProductDialog />, { wrapper: createWrapper() });

    const trigger = screen.getByText('Add Product');
    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByText('Create New Product')).toBeInTheDocument();
    });
  });

  it('renders all form fields when dialog is open', async () => {
    const user = userEvent.setup();
    render(<CreateProductDialog />, { wrapper: createWrapper() });

    const trigger = screen.getByText('Add Product');
    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByLabelText(/Category/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Product Name/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Price/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Account Email/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Account Password/)).toBeInTheDocument();
    });
  });

  it('allows filling out the form', async () => {
    const user = userEvent.setup();
    render(<CreateProductDialog />, { wrapper: createWrapper() });

    const trigger = screen.getByText('Add Product');
    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByLabelText(/Product Name/)).toBeInTheDocument();
    });

    // Fill out form fields
    const nameInput = screen.getByLabelText(/Product Name/);
    await user.type(nameInput, 'Premium Netflix Account');

    const descriptionInput = screen.getByLabelText(/Description/);
    await user.type(descriptionInput, 'This is a premium Netflix account with 4K support');

    const priceInput = screen.getByLabelText(/Price/);
    await user.clear(priceInput);
    await user.type(priceInput, '25.99');

    const emailInput = screen.getByLabelText(/Account Email/);
    await user.type(emailInput, 'account@example.com');

    const passwordInput = screen.getByLabelText(/Account Password/);
    await user.type(passwordInput, 'password123');

    // Verify form fields are filled
    expect(nameInput).toHaveValue('Premium Netflix Account');
    expect(descriptionInput).toHaveValue('This is a premium Netflix account with 4K support');
    expect(priceInput).toHaveValue(25.99);
    expect(emailInput).toHaveValue('account@example.com');
    expect(passwordInput).toHaveValue('password123');
  });

  it('renders custom trigger when provided', () => {
    const customTrigger = <button>Custom Trigger</button>;
    render(<CreateProductDialog trigger={customTrigger} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText('Custom Trigger')).toBeInTheDocument();
  });
});
