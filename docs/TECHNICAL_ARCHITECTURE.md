# Technical Architecture - Frontend Implementation
## Academic Marketplace UI

**Document Version**: 1.0
**Last Updated**: 2025-11-15
**Author**: Project Coordinator

---

## Table of Contents

1. [Technology Stack](#technology-stack)
2. [State Management](#state-management)
3. [Component Architecture](#component-architecture)
4. [API Integration](#api-integration)
5. [Routing & Navigation](#routing--navigation)
6. [Security](#security)
7. [Performance Optimization](#performance-optimization)
8. [Error Handling](#error-handling)

---

## Technology Stack

### Core Framework
- **Next.js 14** (App Router)
- **React 18** (Server & Client Components)
- **TypeScript 5+** (Strict mode enabled)

### Styling & UI
- **Tailwind CSS 3.x** - Utility-first CSS framework
- **Shadcn/ui** - Headless UI components (recommended)
  - Components: Button, Dialog, Form, Table, Dropdown, Toast
  - Installation: `npx shadcn-ui@latest init`
- **Lucide React** - Icon library

### Data Fetching & State
- **TanStack Query (React Query) v5** - Server state management
- **React Context API** - Global UI state (auth, theme)
- **Zustand** (optional) - Alternative for complex client state

### Forms & Validation
- **React Hook Form** - Form state management
- **Zod** - Schema validation (matches backend)

### HTTP & API
- **Native Fetch API** - With custom wrapper
- **Axios** (optional) - If interceptors needed

### Testing
- **Jest** - Unit testing
- **React Testing Library** - Component testing
- **Playwright** - E2E testing
- **MSW (Mock Service Worker)** - API mocking

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Husky** - Git hooks
- **TypeScript** - Type safety

---

## State Management

### 1. Authentication State (React Context)

**File**: `/src/context/AuthContext.tsx`

```typescript
interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export const AuthProvider: React.FC = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount, check for existing token
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      validateToken(storedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const validateToken = async (token: string) => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const { user } = await response.json();
        setUser(user);
        setToken(token);
      } else {
        logout();
      }
    } catch {
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await apiClient<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    setUser(response.user);
    setToken(response.token);
    localStorage.setItem('token', response.token);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!user, isLoading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
```

**Usage:**
```typescript
const { user, isAuthenticated, login, logout } = useAuth();
```

---

### 2. Server State (React Query)

**File**: `/src/lib/queryClient.ts`

```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 10, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0,
    },
  },
});
```

**Example: Products Query**

```typescript
// /src/hooks/useProducts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useProducts(filters?: ProductFilters) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: () => fetchProducts(filters),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProductInput) => createProduct(data),
    onSuccess: () => {
      // Invalidate and refetch products
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
```

**Usage:**
```typescript
const { data: products, isLoading, error } = useProducts({ category: 'netflix' });
const createMutation = useCreateProduct();

const handleCreate = async (data) => {
  await createMutation.mutateAsync(data);
};
```

---

### 3. Local UI State (useState)

Use for component-specific state:
- Modal open/close
- Form input values (or use React Hook Form)
- Loading states
- Temporary UI state

---

## Component Architecture

### 1. Atomic Design Principles

```
components/
├── atoms/           # Basic building blocks
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Badge.tsx
│   └── Spinner.tsx
├── molecules/       # Combinations of atoms
│   ├── FormField.tsx
│   ├── ProductCard.tsx
│   └── WalletBadge.tsx
├── organisms/       # Complex UI sections
│   ├── ProductList.tsx
│   ├── PurchaseModal.tsx
│   └── Sidebar.tsx
├── templates/       # Page layouts
│   ├── DashboardLayout.tsx
│   └── AuthLayout.tsx
└── pages/           # Complete pages (in app/)
```

---

### 2. Component Patterns

**Protected Route Component:**

```typescript
// /src/components/auth/ProtectedRoute.tsx
export function ProtectedRoute({ children, allowedRoles }: Props) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return null;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Forbidden />;
  }

  return <>{children}</>;
}
```

**Data Table Component:**

```typescript
// /src/components/shared/DataTable.tsx
interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  onRowClick?: (row: T) => void;
  pagination?: PaginationProps;
}

export function DataTable<T>({ data, columns, onRowClick, pagination }: DataTableProps<T>) {
  // Implementation using Shadcn Table
}
```

---

### 3. Layout Structure

**Dashboard Layout (Shared Across Roles):**

```typescript
// /src/app/dashboard/[role]/layout.tsx
export default function DashboardLayout({ children, params }) {
  const { user } = useAuth();

  const menuItems = getMenuItemsForRole(user.role);

  return (
    <div className="flex h-screen">
      <Sidebar menuItems={menuItems} user={user} />
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  );
}
```

---

## API Integration

### API Client Wrapper

**File**: `/src/lib/api.ts`

```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiClient<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const token = localStorage.getItem('token');

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options?.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle non-200 responses
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      errorData.error || 'An error occurred',
      response.status,
      errorData.details
    );
  }

  return response.json();
}
```

**Usage:**

```typescript
// GET request
const products = await apiClient<ProductsResponse>('/api/v1/products?category=netflix');

// POST request
const newProduct = await apiClient<Product>('/api/v1/products', {
  method: 'POST',
  body: JSON.stringify({ category: 'netflix', price: 15.99, ... })
});

// Error handling
try {
  await apiClient('/api/v1/purchases', { method: 'POST', ... });
} catch (error) {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      toast.error('Insufficient balance');
    }
  }
}
```

---

### API Service Layer

Create service files for each domain:

**File**: `/src/services/productService.ts`

```typescript
export const productService = {
  async getProducts(filters?: ProductFilters): Promise<ProductsResponse> {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.minPrice) params.append('minPrice', filters.minPrice.toString());
    // ... more filters

    return apiClient<ProductsResponse>(`/api/v1/products?${params}`);
  },

  async createProduct(data: CreateProductInput): Promise<Product> {
    return apiClient<Product>('/api/v1/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateProduct(id: string, data: UpdateProductInput): Promise<Product> {
    return apiClient<Product>(`/api/v1/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteProduct(id: string): Promise<void> {
    return apiClient<void>(`/api/v1/products/${id}`, { method: 'DELETE' });
  },
};
```

---

## Routing & Navigation

### Role-Based Routing

**Middleware**: `/src/middleware.ts` (Already exists)

Current middleware checks for cookie existence. Enhance to read role from JWT (future):

```typescript
// Future enhancement
export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;

  // If accessing /dashboard/admin but role !== 'admin', redirect
  // Implementation requires Edge-compatible JWT parsing
}
```

**Route Protection in Layouts:**

```typescript
// /src/app/dashboard/admin/layout.tsx
export default function AdminLayout({ children }) {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <DashboardLayout role="admin">
        {children}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
```

---

### Navigation After Login

```typescript
// /src/app/login/page.tsx
const handleLogin = async (email: string, password: string) => {
  try {
    await login(email, password);

    // Redirect based on role
    const dashboardPath = getDashboardPathForRole(user.role);
    router.push(dashboardPath);
  } catch (error) {
    // Handle error
  }
};

function getDashboardPathForRole(role: string): string {
  const roleMap: Record<string, string> = {
    admin: '/dashboard/admin',
    provider: '/dashboard/provider/products',
    seller: '/dashboard/seller/marketplace',
    affiliate: '/dashboard/affiliate/transfer',
    conciliator: '/dashboard/conciliator/disputes',
  };
  return roleMap[role] || '/dashboard/seller/marketplace';
}
```

---

## Security

### 1. Token Management

**Storage:**
- Store JWT in `localStorage` (for programmatic access)
- Also set as HTTP cookie (for middleware)

**Expiration Handling:**

```typescript
// /src/hooks/useTokenRefresh.ts
export function useTokenRefresh() {
  const { token, logout } = useAuth();

  useEffect(() => {
    if (!token) return;

    // Decode JWT to check expiration
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiresAt = payload.exp * 1000; // Convert to milliseconds
    const now = Date.now();

    const timeUntilExpiry = expiresAt - now;

    if (timeUntilExpiry <= 0) {
      // Already expired
      logout();
      return;
    }

    // Warn user 5 minutes before expiration
    const warningTime = timeUntilExpiry - 5 * 60 * 1000;
    if (warningTime > 0) {
      setTimeout(() => {
        toast.warning('Your session will expire in 5 minutes. Please save your work.');
      }, warningTime);
    }

    // Auto-logout on expiration
    setTimeout(() => {
      logout();
      toast.error('Your session has expired. Please log in again.');
    }, timeUntilExpiry);
  }, [token]);
}
```

---

### 2. Input Sanitization

**Prevent XSS:**

```typescript
import DOMPurify from 'isomorphic-dompurify';

function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty);
}

// Use when rendering user-generated content
<div dangerouslySetInnerHTML={{ __html: sanitizeHtml(userInput) }} />
```

**Form Validation:**

Use Zod schemas matching backend:

```typescript
import { z } from 'zod';

const createProductSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  price: z.number().positive('Price must be positive'),
  accountEmail: z.string().email('Invalid email'),
  accountPassword: z.string().min(1, 'Password is required'),
});

type CreateProductInput = z.infer<typeof createProductSchema>;
```

---

### 3. Sensitive Data Handling

**Never Log Passwords:**

```typescript
// ❌ BAD
console.log('Creating product:', productData); // May include password

// ✅ GOOD
console.log('Creating product:', { ...productData, accountPassword: '[REDACTED]' });
```

**Clear Clipboard After Copy:**

```typescript
const copyPasswordToClipboard = async (password: string) => {
  await navigator.clipboard.writeText(password);
  toast.success('Password copied to clipboard');

  // Clear clipboard after 30 seconds
  setTimeout(async () => {
    await navigator.clipboard.writeText('');
  }, 30000);
};
```

---

## Performance Optimization

### 1. Code Splitting

**Lazy Load Heavy Components:**

```typescript
import dynamic from 'next/dynamic';

// Load chart library only when needed
const AnalyticsChart = dynamic(() => import('@/components/analytics/Chart'), {
  loading: () => <Spinner />,
  ssr: false,
});
```

---

### 2. Image Optimization

Use Next.js Image component:

```typescript
import Image from 'next/image';

<Image
  src="/product-placeholder.png"
  alt="Product"
  width={300}
  height={200}
  placeholder="blur"
/>
```

---

### 3. React Query Optimization

**Prefetch Data on Hover:**

```typescript
const queryClient = useQueryClient();

const prefetchProduct = (productId: string) => {
  queryClient.prefetchQuery({
    queryKey: ['product', productId],
    queryFn: () => fetchProductById(productId),
  });
};

<ProductCard
  onMouseEnter={() => prefetchProduct(product.id)}
/>
```

**Optimistic Updates:**

```typescript
const deleteMutation = useMutation({
  mutationFn: deleteProduct,
  onMutate: async (productId) => {
    // Cancel ongoing queries
    await queryClient.cancelQueries({ queryKey: ['products'] });

    // Snapshot previous value
    const previousProducts = queryClient.getQueryData(['products']);

    // Optimistically update
    queryClient.setQueryData(['products'], (old) =>
      old.filter((p) => p.id !== productId)
    );

    return { previousProducts };
  },
  onError: (err, productId, context) => {
    // Rollback on error
    queryClient.setQueryData(['products'], context.previousProducts);
  },
  onSettled: () => {
    // Refetch to ensure sync
    queryClient.invalidateQueries({ queryKey: ['products'] });
  },
});
```

---

### 4. Memoization

**Expensive Calculations:**

```typescript
import { useMemo } from 'react';

const totalSpent = useMemo(() => {
  return purchases.reduce((sum, p) => sum + parseFloat(p.amount), 0);
}, [purchases]);
```

**Prevent Unnecessary Rerenders:**

```typescript
import { memo } from 'react';

const ProductCard = memo(({ product }) => {
  // Component won't rerender if props haven't changed
});
```

---

## Error Handling

### 1. Global Error Boundary

**File**: `/src/components/ErrorBoundary.tsx`

```typescript
export class ErrorBoundary extends React.Component<Props, State> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Send to error tracking service (Sentry, etc.)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-container">
          <h1>Something went wrong</h1>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

### 2. API Error Handling

**Centralized Error Handler:**

```typescript
// /src/lib/errorHandler.ts
export function handleApiError(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 400:
        return 'Invalid input. Please check your data.';
      case 401:
        return 'You are not authenticated. Please log in.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return 'This resource already exists.';
      case 500:
        return 'An unexpected error occurred. Please try again later.';
      default:
        return error.message;
    }
  }

  return 'An unexpected error occurred.';
}
```

**Usage:**

```typescript
try {
  await createProduct(data);
  toast.success('Product created successfully');
} catch (error) {
  const message = handleApiError(error);
  toast.error(message);
}
```

---

### 3. Form Validation Errors

**Display Inline Errors:**

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const {
  register,
  handleSubmit,
  formState: { errors },
} = useForm({
  resolver: zodResolver(createProductSchema),
});

<form onSubmit={handleSubmit(onSubmit)}>
  <input {...register('price')} />
  {errors.price && <span className="error">{errors.price.message}</span>}
</form>
```

---

## Development Workflow

### 1. Environment Setup

**Install Dependencies:**

```bash
npm install
npm install -D @tanstack/react-query react-hook-form zod
npm install -D @shadcn/ui tailwindcss
npm install -D @testing-library/react @testing-library/jest-dom
npm install -D @playwright/test
```

**Environment Variables:**

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
DATABASE_URL=postgresql://...
JWT_SECRET=...
```

---

### 2. Git Workflow

**Branch Strategy:**

```bash
git checkout -b feature/epic-1-authentication
# Work on epic
git commit -m "feat: implement login page"
git push origin feature/epic-1-authentication
# Create PR
```

**Commit Message Format:**

```
<type>(<scope>): <description>

Types: feat, fix, docs, style, refactor, test, chore
Examples:
- feat(auth): add login page
- fix(products): handle empty state
- test(purchases): add purchase flow tests
```

---

### 3. Code Review Checklist

- [ ] Code follows TypeScript best practices
- [ ] No `any` types
- [ ] Components have proper prop types
- [ ] Error handling implemented
- [ ] Loading states implemented
- [ ] Tests written and passing
- [ ] Accessibility: keyboard navigation, ARIA labels
- [ ] Responsive design tested

---

## Summary

This architecture provides:

- **Scalability**: Modular component structure
- **Maintainability**: Clear separation of concerns
- **Performance**: Optimized rendering and data fetching
- **Security**: Token management, input validation
- **Developer Experience**: Type safety, clear patterns

**Next Steps:**
1. Set up project with chosen tech stack
2. Implement AuthContext and ProtectedRoute
3. Build Epic 1 (Authentication)
4. Iterate through epics following work plan

---

**Questions? Contact the Project Coordinator.**
