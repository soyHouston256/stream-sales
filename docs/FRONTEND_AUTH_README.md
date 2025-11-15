# Frontend Authentication System - Implementation Guide

## Overview

This document describes the complete frontend authentication and RBAC (Role-Based Access Control) system implemented for Stream Sales Marketplace.

## Implementation Summary

### Completed Features

1. **Authentication Pages**
   - Login page with email/password validation
   - Register page with role selection and referral code support
   - Automatic redirect after successful authentication
   - Loading states and error handling

2. **Authentication Infrastructure**
   - `AuthContext` - Global authentication state provider
   - `useAuth` hook - Easy access to auth state and methods
   - `authService` - API calls for login, register, and getCurrentUser
   - `tokenManager` - Token storage and retrieval in localStorage

3. **Protected Routes**
   - `ProtectedRoute` component - HOC for route protection
   - Automatic redirect to login if not authenticated
   - Role-based access control per route

4. **Role-Based Dashboards**
   - Admin Dashboard - System management and monitoring
   - Provider Dashboard - Product and sales management
   - Seller Dashboard - Purchase and balance management
   - Affiliate Dashboard - Referral and commission tracking
   - Conciliator Dashboard - Payment validation queue

5. **UI Components (Shadcn/ui)**
   - Button, Input, Label, Card components
   - Toast notifications for user feedback
   - Responsive layouts with Tailwind CSS
   - Dark mode support (CSS variables ready)

## Directory Structure

```
src/
├── app/
│   ├── login/
│   │   └── page.tsx                    # Login page
│   ├── register/
│   │   └── page.tsx                    # Register page
│   └── dashboard/
│       ├── admin/
│       │   ├── layout.tsx              # Admin layout
│       │   └── page.tsx                # Admin dashboard
│       ├── provider/
│       │   ├── layout.tsx              # Provider layout
│       │   └── page.tsx                # Provider dashboard
│       ├── seller/
│       │   ├── layout.tsx              # Seller layout
│       │   └── page.tsx                # Seller dashboard
│       ├── affiliate/
│       │   ├── layout.tsx              # Affiliate layout
│       │   └── page.tsx                # Affiliate dashboard
│       └── conciliator/
│           ├── layout.tsx              # Conciliator layout
│           └── page.tsx                # Conciliator dashboard
│
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx               # Login form with validation
│   │   ├── RegisterForm.tsx            # Register form with validation
│   │   └── ProtectedRoute.tsx          # Route protection HOC
│   ├── layout/
│   │   ├── DashboardLayout.tsx         # Base dashboard layout
│   │   ├── Header.tsx                  # App header with user menu
│   │   ├── Sidebar.tsx                 # Navigation sidebar
│   │   └── navigation/
│   │       ├── AdminNav.tsx            # Admin navigation items
│   │       ├── ProviderNav.tsx         # Provider navigation items
│   │       ├── SellerNav.tsx           # Seller navigation items
│   │       ├── AffiliateNav.tsx        # Affiliate navigation items
│   │       └── ConciliatorNav.tsx      # Conciliator navigation items
│   └── ui/
│       ├── button.tsx                  # Button component
│       ├── input.tsx                   # Input component
│       ├── label.tsx                   # Label component
│       ├── card.tsx                    # Card component
│       ├── toast.tsx                   # Toast notification
│       └── toaster.tsx                 # Toast container
│
├── lib/
│   ├── auth/
│   │   ├── AuthContext.tsx             # Auth context provider
│   │   ├── useAuth.ts                  # Auth hook
│   │   └── authService.ts              # Auth API calls
│   ├── api/
│   │   └── client.ts                   # API client with token injection
│   └── utils/
│       ├── tokenManager.ts             # Token storage management
│       └── roleRedirect.ts             # Role-based routing logic
│
└── types/
    └── auth.ts                         # Auth-related TypeScript types
```

## Usage Guide

### 1. Using Authentication in Components

```typescript
'use client';

import { useAuth } from '@/lib/auth/useAuth';

export function MyComponent() {
  const { user, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) {
    return <div>Please login</div>;
  }

  return (
    <div>
      <p>Welcome, {user?.name}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### 2. Protecting Routes

```typescript
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function MyPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <div>Admin only content</div>
    </ProtectedRoute>
  );
}
```

### 3. Making Authenticated API Calls

```typescript
import { apiClient } from '@/lib/api/client';

// Public endpoint
const data = await apiClient.get('/api/public/data');

// Protected endpoint (requires auth)
const userData = await apiClient.get('/api/auth/me', true);

// POST with authentication
const result = await apiClient.post(
  '/api/protected/action',
  { data: 'value' },
  true // requiresAuth
);
```

### 4. Role-Based Redirection

```typescript
import { getDashboardRoute } from '@/lib/utils/roleRedirect';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/useAuth';

export function RedirectToDashboard() {
  const { user } = useAuth();
  const router = useRouter();

  const handleRedirect = () => {
    if (user) {
      const route = getDashboardRoute(user.role);
      router.push(route);
    }
  };

  return <button onClick={handleRedirect}>Go to Dashboard</button>;
}
```

## API Integration

### Endpoints Used

1. **POST /api/auth/login**
   - Authenticates user with email/password
   - Returns user object and JWT token
   - Sets httpOnly cookie automatically (backend)

2. **POST /api/auth/register**
   - Creates new user account
   - Creates wallet automatically (backend)
   - Returns user object and JWT token

3. **GET /api/auth/me**
   - Requires Authorization header with Bearer token
   - Returns current user data
   - Used to validate token and refresh user state

### Token Flow

1. User logs in or registers
2. Backend returns JWT token
3. Frontend stores token in `localStorage` (key: `auth_token`)
4. All authenticated API calls include `Authorization: Bearer <token>` header
5. If token expires (401 response), user is logged out automatically

## Testing

### Unit Tests Created

- ✅ `tokenManager.test.ts` - Token storage operations (7 tests)
- ✅ `roleRedirect.test.ts` - Role-based routing logic (11 tests)
- ✅ `useAuth.test.tsx` - Auth hook functionality (2 tests)

**Total Frontend Auth Tests**: 20 tests (all passing)
**Total Project Tests**: 416 tests (all passing)

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test tokenManager

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

## Security Considerations

1. **Token Storage**: Tokens are stored in `localStorage` for client-side access. For production, consider using `httpOnly` cookies exclusively.

2. **HTTPS Only**: In production, ensure all API calls are made over HTTPS.

3. **Token Expiration**: Tokens expire after 7 days (configurable via `JWT_EXPIRES_IN` env var).

4. **RBAC**: Role-based access is enforced both in frontend (UX) and backend (security).

5. **Input Validation**: All forms use Zod schemas for validation before submission.

## Environment Variables

Required in `.env.local`:

```env
NEXT_PUBLIC_API_URL=""  # Leave empty for same-origin requests
```

## TypeScript Types

All authentication-related types are defined in `src/types/auth.ts`:

```typescript
export type UserRole = 'admin' | 'provider' | 'seller' | 'affiliate' | 'conciliator';

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}
```

## Accessibility Features

- ✅ All forms have proper labels associated with inputs
- ✅ Error messages have `role="alert"` for screen reader announcements
- ✅ Keyboard navigation works throughout all forms
- ✅ Loading states have descriptive text
- ✅ ARIA attributes for invalid inputs (`aria-invalid`, `aria-describedby`)

## Responsive Design

- ✅ Mobile-first approach with Tailwind CSS
- ✅ Forms are responsive across all screen sizes
- ✅ Sidebar collapses on mobile (ready for implementation)
- ✅ Cards and layouts use grid/flexbox for flexibility

## Next Steps / Future Enhancements

1. **E2E Tests**: Implement Playwright tests for complete user flows
2. **OAuth Integration**: Add Google/GitHub login options
3. **2FA Support**: Implement two-factor authentication
4. **Session Management**: Add session timeout warnings
5. **Dark Mode Toggle**: Implement theme switcher UI
6. **i18n Support**: Add multi-language support
7. **WebSocket Integration**: Real-time notifications for dashboards
8. **Analytics**: Track auth events (login, logout, failed attempts)

## Troubleshooting

### Token not persisting
- Check if `localStorage` is available in the browser
- Verify `tokenManager.setToken()` is called after login/register

### Infinite redirect loops
- Ensure `isLoading` state is checked before redirecting
- Verify AuthContext is wrapping the entire app in layout.tsx

### TypeScript errors
- Run `npm run build` to check for type errors
- Ensure all path aliases are configured in tsconfig.json

## Support

For issues or questions, refer to:
- Backend API documentation: `/home/user/stream-sales/docs/`
- CLAUDE.md: Project architecture guidelines
- DDD patterns: Domain-driven design structure

---

**Implementation Date**: 2025-11-15
**Status**: ✅ Complete and Ready for Development
**Tests**: 416 passing (20 frontend auth + 396 backend)
