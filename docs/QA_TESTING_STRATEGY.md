# QA & Testing Strategy
## Academic Marketplace - Frontend Testing Plan

**QA Lead**: qa-automation-engineer agent
**Document Version**: 1.0
**Last Updated**: 2025-11-15

---

## Table of Contents

1. [Testing Pyramid](#testing-pyramid)
2. [Unit Testing](#unit-testing)
3. [Integration Testing](#integration-testing)
4. [End-to-End Testing](#end-to-end-testing)
5. [API Contract Testing](#api-contract-testing)
6. [Performance Testing](#performance-testing)
7. [Accessibility Testing](#accessibility-testing)
8. [Test Automation](#test-automation)
9. [Quality Gates](#quality-gates)

---

## Testing Pyramid

```
        /\
       /  \  E2E (10%)
      /____\
     /      \  Integration (30%)
    /________\
   /          \  Unit (60%)
  /____________\
```

**Target Coverage:**
- **Unit Tests**: 60% of test suite, 80%+ code coverage
- **Integration Tests**: 30% of test suite, critical user paths
- **E2E Tests**: 10% of test suite, happy paths + critical errors

---

## Unit Testing

### Tools
- **Jest** - Test runner
- **React Testing Library** - Component testing
- **@testing-library/jest-dom** - DOM matchers

### What to Test

**Components:**
- Rendering with different props
- User interactions (clicks, inputs)
- Conditional rendering
- Error states
- Loading states

**Utilities:**
- Pure functions
- Data transformations
- Validation logic

**Hooks:**
- Custom hooks behavior
- State updates
- Side effects

---

### Unit Test Examples

**Test 1: Button Component**

```typescript
// /src/components/atoms/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click</Button>);

    fireEvent.click(screen.getByText('Click'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click</Button>);
    expect(screen.getByText('Click')).toBeDisabled();
  });

  it('shows loading spinner when loading', () => {
    render(<Button isLoading>Click</Button>);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });
});
```

---

**Test 2: Form Validation**

```typescript
// /src/components/auth/LoginForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginForm } from './LoginForm';

describe('LoginForm', () => {
  it('shows error for invalid email', async () => {
    render(<LoginForm onSubmit={jest.fn()} />);

    const emailInput = screen.getByLabelText('Email');
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(screen.getByText('Invalid email format')).toBeInTheDocument();
    });
  });

  it('shows error for short password', async () => {
    render(<LoginForm onSubmit={jest.fn()} />);

    const passwordInput = screen.getByLabelText('Password');
    fireEvent.change(passwordInput, { target: { value: '123' } });
    fireEvent.blur(passwordInput);

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
    });
  });

  it('calls onSubmit with valid data', async () => {
    const handleSubmit = jest.fn();
    render(<LoginForm onSubmit={handleSubmit} />);

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' },
    });

    fireEvent.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });
});
```

---

**Test 3: Custom Hook**

```typescript
// /src/hooks/useWallet.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { useWallet } from './useWallet';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useWallet', () => {
  it('fetches wallet balance', async () => {
    const { result } = renderHook(() => useWallet(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.balance).toBeDefined();
  });
});
```

---

### Unit Test Guidelines

**DO:**
- Test behavior, not implementation
- Use descriptive test names
- Mock external dependencies (API calls)
- Test edge cases and error states
- Keep tests isolated (no shared state)

**DON'T:**
- Test third-party libraries
- Test implementation details (internal state)
- Write overly complex tests
- Skip error cases

---

## Integration Testing

### What to Test

**User Flows:**
- Login → Dashboard redirect
- Create product → View in list
- Purchase product → View in purchases
- Transfer money → Balance update

**Component Integration:**
- Form submission → API call → UI update
- Modal open → Form fill → Submit → Close

---

### Integration Test Examples

**Test 1: Product Creation Flow**

```typescript
// /src/app/dashboard/provider/products.integration.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { ProductsPage } from './page';

const server = setupServer(
  rest.post('/api/v1/products', (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        product: {
          id: 'prod_123',
          category: 'netflix',
          price: '15.99',
          status: 'available',
        },
      })
    );
  }),

  rest.get('/api/v1/products', (req, res, ctx) => {
    return res(
      ctx.json({
        products: [
          { id: 'prod_123', category: 'netflix', price: '15.99' },
        ],
        total: 1,
      })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Product Creation Flow', () => {
  it('creates product and displays in list', async () => {
    render(<ProductsPage />);

    // Open create modal
    fireEvent.click(screen.getByText('Create Product'));

    // Fill form
    fireEvent.change(screen.getByLabelText('Category'), {
      target: { value: 'netflix' },
    });
    fireEvent.change(screen.getByLabelText('Price'), {
      target: { value: '15.99' },
    });
    fireEvent.change(screen.getByLabelText('Account Email'), {
      target: { value: 'test@netflix.com' },
    });
    fireEvent.change(screen.getByLabelText('Account Password'), {
      target: { value: 'password123' },
    });

    // Submit
    fireEvent.click(screen.getByText('Create'));

    // Wait for product to appear in list
    await waitFor(() => {
      expect(screen.getByText('netflix')).toBeInTheDocument();
      expect(screen.getByText('$15.99')).toBeInTheDocument();
    });
  });
});
```

---

**Test 2: Purchase Flow with Insufficient Balance**

```typescript
// /src/app/dashboard/seller/purchase.integration.test.tsx
describe('Purchase Flow - Insufficient Balance', () => {
  it('shows error when balance is too low', async () => {
    server.use(
      rest.get('/api/v1/wallets/balance', (req, res, ctx) => {
        return res(ctx.json({ wallet: { balance: '5.00' } }));
      }),

      rest.post('/api/v1/purchases', (req, res, ctx) => {
        return res(
          ctx.status(403),
          ctx.json({ error: 'Insufficient balance' })
        );
      })
    );

    render(<MarketplacePage />);

    // Click on a $15.99 product
    fireEvent.click(screen.getByText('Buy Now'));

    // Confirm purchase
    fireEvent.click(screen.getByText('Confirm Purchase'));

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText('Insufficient balance')).toBeInTheDocument();
    });
  });
});
```

---

## End-to-End Testing

### Tools
- **Playwright** (recommended) or **Cypress**
- Runs in real browser environment
- Tests complete user journeys

---

### E2E Test Examples

**Test 1: Complete Registration and Login Flow**

```typescript
// /e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('user can register and login', async ({ page }) => {
    // Navigate to register page
    await page.goto('/register');

    // Fill registration form
    await page.fill('input[name="email"]', 'newuser@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.fill('input[name="name"]', 'New User');
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // Logout
    await page.click('button:has-text("Logout")');

    // Login again
    await page.goto('/login');
    await page.fill('input[name="email"]', 'newuser@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Should be back in dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('text=New User')).toBeVisible();
  });
});
```

---

**Test 2: Complete Purchase Flow**

```typescript
// /e2e/purchase.spec.ts
test.describe('Purchase Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as seller
    await page.goto('/login');
    await page.fill('input[name="email"]', 'seller@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
  });

  test('seller can purchase a product', async ({ page }) => {
    // Navigate to marketplace
    await page.goto('/dashboard/seller/marketplace');

    // Wait for products to load
    await expect(page.locator('.product-card').first()).toBeVisible();

    // Click first product's "Buy" button
    await page.click('.product-card >> button:has-text("Buy Now")');

    // Purchase modal should open
    await expect(page.locator('text=Confirm Purchase')).toBeVisible();

    // Check balance is shown
    await expect(page.locator('text=Current Balance')).toBeVisible();

    // Confirm purchase
    await page.click('button:has-text("Confirm Purchase")');

    // Wait for success modal with credentials
    await expect(page.locator('text=Purchase Successful')).toBeVisible();

    // Credentials should be visible
    await expect(page.locator('text=Account Email')).toBeVisible();
    await expect(page.locator('text=Account Password')).toBeVisible();

    // Copy password to clipboard
    await page.click('button:has-text("Copy Password")');

    // Toast notification
    await expect(page.locator('text=Password copied')).toBeVisible();

    // Close modal
    await page.click('button:has-text("Close")');

    // Navigate to purchases page
    await page.goto('/dashboard/seller/purchases');

    // Purchased product should appear in list
    await expect(page.locator('table >> tr').nth(1)).toBeVisible();
  });

  test('shows error when balance insufficient', async ({ page }) => {
    // Setup: user has $0 balance
    // (Requires test data setup or API mocking)

    await page.goto('/dashboard/seller/marketplace');

    // Try to purchase
    await page.click('.product-card >> button:has-text("Buy Now")');
    await page.click('button:has-text("Confirm Purchase")');

    // Should show error
    await expect(page.locator('text=Insufficient balance')).toBeVisible();
  });
});
```

---

**Test 3: Provider Product Management**

```typescript
// /e2e/provider.spec.ts
test.describe('Provider Product Management', () => {
  test('provider can create, edit, and delete product', async ({ page }) => {
    // Login as provider
    await page.goto('/login');
    await page.fill('input[name="email"]', 'provider@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Navigate to products page
    await page.goto('/dashboard/provider/products');

    // Create new product
    await page.click('button:has-text("Create Product")');

    await page.selectOption('select[name="category"]', 'netflix');
    await page.fill('input[name="price"]', '15.99');
    await page.fill('input[name="accountEmail"]', 'test@netflix.com');
    await page.fill('input[name="accountPassword"]', 'testpass123');
    await page.click('button:has-text("Create")');

    // Product should appear in table
    await expect(page.locator('text=netflix')).toBeVisible();
    await expect(page.locator('text=$15.99')).toBeVisible();

    // Edit product
    await page.click('tr:has-text("netflix") >> button[aria-label="Edit"]');
    await page.fill('input[name="price"]', '19.99');
    await page.click('button:has-text("Save")');

    // Updated price should show
    await expect(page.locator('text=$19.99')).toBeVisible();

    // Delete product
    await page.click('tr:has-text("netflix") >> button[aria-label="Delete"]');
    await page.click('button:has-text("Confirm")'); // Confirmation dialog

    // Product should be removed
    await expect(page.locator('text=netflix')).not.toBeVisible();
  });
});
```

---

## API Contract Testing

### Purpose
Ensure frontend expectations match backend API responses.

### Tools
- **MSW (Mock Service Worker)** - Mock API during development/testing
- **Pact** (optional) - Consumer-driven contract testing

---

### MSW Setup

**File**: `/src/mocks/handlers.ts`

```typescript
import { rest } from 'msw';

export const handlers = [
  // Auth endpoints
  rest.post('/api/auth/login', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        user: { id: 'user_123', email: 'test@example.com', role: 'seller' },
        token: 'mock_jwt_token',
      })
    );
  }),

  // Products endpoint
  rest.get('/api/v1/products', (req, res, ctx) => {
    return res(
      ctx.json({
        products: [
          {
            id: 'prod_1',
            category: 'netflix',
            price: '15.99',
            status: 'available',
          },
        ],
        total: 1,
        hasMore: false,
      })
    );
  }),

  // Purchases endpoint
  rest.post('/api/v1/purchases', async (req, res, ctx) => {
    const body = await req.json();

    return res(
      ctx.status(201),
      ctx.json({
        purchase: {
          id: 'purchase_123',
          productId: body.productId,
          amount: '15.99',
        },
        product: {
          accountEmail: 'test@netflix.com',
          accountPassword: 'decryptedPassword',
        },
        walletBalance: '84.01',
      })
    );
  }),
];
```

**File**: `/src/mocks/server.ts`

```typescript
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

**File**: `/src/setupTests.ts`

```typescript
import { server } from './mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

---

## Performance Testing

### Metrics to Monitor

**Web Vitals:**
- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1

**Custom Metrics:**
- Time to Interactive (TTI): < 3.5s
- Bundle Size: < 500KB (gzipped)
- API Response Time: < 500ms

---

### Tools

**Lighthouse:**
```bash
npm install -g lighthouse
lighthouse http://localhost:3000 --view
```

**Target Scores:**
- Performance: > 90
- Accessibility: > 95
- Best Practices: > 95
- SEO: > 90

---

**Playwright Performance Testing:**

```typescript
test('marketplace page loads in < 3 seconds', async ({ page }) => {
  const startTime = Date.now();

  await page.goto('/dashboard/seller/marketplace');
  await page.waitForSelector('.product-card');

  const loadTime = Date.now() - startTime;
  expect(loadTime).toBeLessThan(3000);
});
```

---

## Accessibility Testing

### Standards
- **WCAG 2.1 Level AA** compliance

### Tools
- **axe DevTools** - Browser extension
- **jest-axe** - Automated accessibility testing
- **Screen readers**: NVDA (Windows), VoiceOver (Mac)

---

### Accessibility Test Example

```typescript
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('LoginForm has no accessibility violations', async () => {
  const { container } = render(<LoginForm />);
  const results = await axe(container);

  expect(results).toHaveNoViolations();
});
```

---

### Manual Accessibility Checklist

- [ ] All interactive elements keyboard accessible
- [ ] Focus indicators visible
- [ ] ARIA labels on form inputs
- [ ] Alt text on images
- [ ] Color contrast ratio ≥ 4.5:1
- [ ] Screen reader tested

---

## Test Automation

### CI/CD Pipeline

**GitHub Actions Workflow** (`.github/workflows/test.yml`):

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run unit tests
        run: npm test -- --coverage

      - name: Run E2E tests
        run: npx playwright test

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

### Pre-Commit Hooks (Husky)

**File**: `.husky/pre-commit`

```bash
#!/bin/sh
npm run lint
npm test -- --passWithNoTests
```

---

## Quality Gates

### Before Merging PR

**Code Quality:**
- [ ] ESLint: No errors
- [ ] TypeScript: No compilation errors
- [ ] Prettier: Code formatted

**Testing:**
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] E2E tests passing for affected flows
- [ ] Code coverage > 80%

**Functionality:**
- [ ] All acceptance criteria met
- [ ] Tested in 3 browsers (Chrome, Firefox, Safari)
- [ ] Responsive design tested (mobile, tablet, desktop)
- [ ] No console errors

**Accessibility:**
- [ ] Keyboard navigation works
- [ ] Screen reader tested
- [ ] No axe violations

**Performance:**
- [ ] Page load < 3s
- [ ] No unnecessary rerenders
- [ ] Images optimized

---

### Before Production Deployment

**Security:**
- [ ] No secrets in code
- [ ] Input sanitization implemented
- [ ] Authentication working
- [ ] Authorization checked

**Documentation:**
- [ ] README updated
- [ ] API integration documented
- [ ] Known issues documented

**Monitoring:**
- [ ] Error tracking configured (Sentry, etc.)
- [ ] Analytics configured (Google Analytics, etc.)

---

## Testing Checklist by Epic

### Epic 1: Authentication
- [ ] Unit: Login form validation
- [ ] Unit: Register form validation
- [ ] Integration: Login API call
- [ ] Integration: Register API call
- [ ] E2E: Register → Login → Dashboard flow
- [ ] E2E: Protected route access denial

### Epic 2: Admin Dashboard
- [ ] Unit: User table pagination
- [ ] Unit: Commission rate validation
- [ ] Integration: User list fetching
- [ ] E2E: Change user role flow

### Epic 3: Provider Dashboard
- [ ] Unit: Product form validation
- [ ] Integration: Create product flow
- [ ] Integration: Edit product flow
- [ ] Integration: Delete product flow
- [ ] E2E: Full product CRUD cycle

### Epic 4: Seller Dashboard
- [ ] Unit: Price filter logic
- [ ] Unit: Balance comparison
- [ ] Integration: Purchase flow (sufficient balance)
- [ ] Integration: Purchase flow (insufficient balance)
- [ ] E2E: Browse → Purchase → View credentials
- [ ] E2E: View purchase history

### Epic 5: Affiliate Dashboard
- [ ] Unit: Transfer form validation
- [ ] Integration: Transfer flow
- [ ] E2E: Transfer money P2P

---

## Bug Reporting Template

**Title**: [Component] Brief description

**Environment**:
- Browser:
- OS:
- Screen size:

**Steps to Reproduce**:
1. Go to...
2. Click on...
3. See error

**Expected Behavior**:
Should show...

**Actual Behavior**:
Shows...

**Screenshots**:
(Attach screenshot)

**Severity**:
- Critical (blocks functionality)
- High (major feature broken)
- Medium (minor issue)
- Low (cosmetic)

---

## Test Metrics Dashboard

Track these metrics weekly:

| Metric | Target | Current |
|--------|--------|---------|
| Unit Test Coverage | > 80% | - |
| Integration Tests Passing | 100% | - |
| E2E Tests Passing | 100% | - |
| Lighthouse Performance | > 90 | - |
| Accessibility Score | > 95 | - |
| Open Bugs (Critical) | 0 | - |
| Open Bugs (High) | < 5 | - |

---

## Summary

This testing strategy ensures:

- **Comprehensive Coverage**: Unit, integration, E2E tests
- **Quality Assurance**: Automated quality gates
- **Performance**: Lighthouse and Web Vitals monitoring
- **Accessibility**: WCAG 2.1 AA compliance
- **Continuous Improvement**: Metrics tracking and bug triage

**Next Steps:**
1. Set up testing infrastructure (Jest, Playwright, MSW)
2. Write tests alongside feature development (TDD)
3. Run tests in CI/CD pipeline
4. Monitor metrics and iterate

---

**Questions? Contact QA Lead or Project Coordinator.**
