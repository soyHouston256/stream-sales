# Frontend Development Work Plan
## Academic Marketplace - UI Implementation

**Project Coordinator**: Project Orchestrator Agent
**Frontend Lead**: frontend-dashboard-builder agent
**QA Lead**: qa-automation-engineer agent
**Timeline**: Weeks 4-5 (6-week sprint)
**Start Date**: 2025-11-15

---

## Executive Summary

**Objective**: Build complete Next.js frontend that consumes the 100% complete backend API (398 tests passing).

**Deliverables**: 6 role-based dashboards with full CRUD operations, authentication flow, and wallet management.

**Backend Status**: ✅ Complete
- Authentication API (3 endpoints)
- Wallets API (2 endpoints)
- Products API (4 endpoints)
- Purchases API (3 endpoints)
- 398 tests passing
- Full API documentation available

---

## Table of Contents

1. [Epic 1: Core Authentication & RBAC](#epic-1-core-authentication--rbac)
2. [Epic 2: Admin Dashboard](#epic-2-admin-dashboard)
3. [Epic 3: Provider Dashboard](#epic-3-provider-dashboard)
4. [Epic 4: Seller Dashboard](#epic-4-seller-dashboard)
5. [Epic 5: Affiliate Dashboard](#epic-5-affiliate-dashboard)
6. [Epic 6: Conciliator Dashboard](#epic-6-conciliator-dashboard)
7. [Technical Architecture](#technical-architecture)
8. [Quality Gates](#quality-gates)
9. [Sprint Schedule](#sprint-schedule)

---

## Epic 1: Core Authentication & RBAC

**Priority**: P0 (Blocker for all other epics)
**Estimated Time**: 3-4 days
**Dependencies**: None

### User Stories

**US-1.1**: As a new user, I want to register an account with an optional referral code
**US-1.2**: As a returning user, I want to log in with email/password
**US-1.3**: As an authenticated user, I want to be redirected to my role-specific dashboard
**US-1.4**: As any user, I want to log out securely

### Tasks

**Task 1.1**: Create Authentication Pages
- [ ] `/app/login/page.tsx` - Login form
- [ ] `/app/register/page.tsx` - Registration form with referral code field
- [ ] Form validation (Zod or React Hook Form)
- [ ] Error handling and display
- [ ] Loading states

**API Integration:**
- POST `/api/auth/login`
- POST `/api/auth/register`

**Acceptance Criteria:**
- Login form validates email format
- Registration requires email, password (min 6 chars)
- Referral code is optional
- Shows error messages for invalid credentials
- Displays loading spinner during API calls

---

**Task 1.2**: Implement JWT Token Management
- [ ] Create `lib/auth.ts` utility
- [ ] Store token in localStorage
- [ ] Sync token with cookie
- [ ] Implement token refresh logic (7-day expiration)
- [ ] Clear token on logout

**Technical Requirements:**
- Read token from cookie or localStorage
- Attach `Authorization: Bearer <token>` to all API calls
- Handle 401 errors globally (redirect to login)

---

**Task 1.3**: Create Protected Route Wrapper
- [ ] `components/auth/ProtectedRoute.tsx`
- [ ] Call `GET /api/auth/me` on mount
- [ ] Redirect to login if unauthenticated
- [ ] Show loading state while validating
- [ ] Store user data in context/state

**API Integration:**
- GET `/api/auth/me`

**Acceptance Criteria:**
- Unauthenticated users redirected to `/login`
- User data available to child components
- Validates token on page refresh

---

**Task 1.4**: Implement Role-Based Routing
- [ ] Create 5 dashboard layouts (one per role)
- [ ] `app/dashboard/admin/layout.tsx`
- [ ] `app/dashboard/provider/layout.tsx`
- [ ] `app/dashboard/seller/layout.tsx`
- [ ] `app/dashboard/affiliate/layout.tsx`
- [ ] `app/dashboard/conciliator/layout.tsx`
- [ ] Redirect based on user.role after login

**Router Logic:**
```typescript
if (user.role === 'admin') navigate('/dashboard/admin')
else if (user.role === 'provider') navigate('/dashboard/provider')
else if (user.role === 'seller') navigate('/dashboard/seller')
// etc.
```

---

**Task 1.5**: Create Shared Sidebar Component
- [ ] `components/layout/Sidebar.tsx`
- [ ] Navigation items based on user role
- [ ] Active route highlighting
- [ ] User profile display (avatar, name, role)
- [ ] Logout button

**Design Requirements:**
- Responsive (collapsible on mobile)
- Role-based menu items
- Active state for current route

---

### Testing Requirements (Epic 1)

**Unit Tests:**
- [ ] Login form validation
- [ ] Registration form validation
- [ ] Token storage/retrieval utilities
- [ ] Protected route logic

**Integration Tests:**
- [ ] Login flow end-to-end
- [ ] Registration flow with API
- [ ] Token expiration handling
- [ ] Role-based redirect logic

**E2E Tests (Playwright/Cypress):**
- [ ] Complete registration → login → dashboard flow
- [ ] Logout and re-login
- [ ] Protected route access denial

---

## Epic 2: Admin Dashboard

**Priority**: P1
**Estimated Time**: 4-5 days
**Dependencies**: Epic 1 (Authentication)

### User Stories

**US-2.1**: As an admin, I want to view all users in the platform
**US-2.2**: As an admin, I want to change user roles
**US-2.3**: As an admin, I want to configure commission rates
**US-2.4**: As an admin, I want to view platform analytics

### Tasks

**Task 2.1**: User Management View
- [ ] `app/dashboard/admin/users/page.tsx`
- [ ] Table component with pagination
- [ ] Search/filter by email, role
- [ ] Click row to open edit modal

**API Integration (Future):**
- GET `/api/admin/users` (not yet implemented)

**Acceptance Criteria:**
- Displays user ID, email, name, role, created date
- Pagination (20 users per page)
- Search by email
- Filter by role dropdown

---

**Task 2.2**: User Edit Modal
- [ ] `components/admin/UserEditModal.tsx`
- [ ] Form to change user role
- [ ] Confirmation dialog for role change
- [ ] Success/error toast notifications

**API Integration (Future):**
- PUT `/api/admin/users/:id` (not yet implemented)

**Acceptance Criteria:**
- Shows current user details
- Dropdown with all 5 roles
- Confirms before saving
- Closes on success

---

**Task 2.3**: Commission Configuration Page
- [ ] `app/dashboard/admin/commissions/page.tsx`
- [ ] Form to update sale commission rate
- [ ] Display current rate
- [ ] Input validation (0-100%)

**API Integration (Future):**
- GET `/api/admin/config/commissions`
- PUT `/api/admin/config/commissions`

**Acceptance Criteria:**
- Shows current commission rate (e.g., "5.00%")
- Validates input (must be 0-100)
- Updates with confirmation
- Shows effective date

---

**Task 2.4**: Analytics Dashboard
- [ ] `app/dashboard/admin/analytics/page.tsx`
- [ ] Display key metrics (total users, total sales, revenue)
- [ ] Charts (sales over time, revenue by category)
- [ ] Filters (date range, category)

**API Integration (Future):**
- GET `/api/admin/reports`

**Mock Data:**
- Use static data for initial implementation
- Replace with real API when available

---

### Testing Requirements (Epic 2)

**Unit Tests:**
- [ ] User table pagination logic
- [ ] Search/filter functions
- [ ] Commission rate validation

**Integration Tests:**
- [ ] User list fetching and rendering
- [ ] Role change flow
- [ ] Commission update flow

---

## Epic 3: Provider Dashboard

**Priority**: P1
**Estimated Time**: 5-6 days
**Dependencies**: Epic 1 (Authentication)

### User Stories

**US-3.1**: As a provider, I want to create new products for sale
**US-3.2**: As a provider, I want to view my product inventory
**US-3.3**: As a provider, I want to edit my product details
**US-3.4**: As a provider, I want to delete unsold products
**US-3.5**: As a provider, I want to view my sales history

### Tasks

**Task 3.1**: My Products List Page
- [ ] `app/dashboard/provider/products/page.tsx`
- [ ] Table/grid view of products
- [ ] Filter by status (available, sold)
- [ ] Filter by category
- [ ] "Create Product" button

**API Integration:**
- GET `/api/v1/products` (filter by providerId on backend)

**Acceptance Criteria:**
- Shows product ID, category, price, status, created date
- Color-coded status badges (green=available, gray=sold)
- Pagination support
- Empty state when no products

---

**Task 3.2**: Create Product Modal/Page
- [ ] `components/provider/CreateProductModal.tsx`
- [ ] Form fields: category, price, accountEmail, accountPassword
- [ ] Category dropdown (netflix, spotify, hbo, disney, prime, youtube, other)
- [ ] Price validation (positive number)
- [ ] Email validation

**API Integration:**
- POST `/api/v1/products`

**Request Body:**
```json
{
  "category": "netflix",
  "price": 15.99,
  "currency": "USD",
  "accountEmail": "account@netflix.com",
  "accountPassword": "plainPassword123"
}
```

**Acceptance Criteria:**
- All fields required except currency (defaults to USD)
- Validates email format
- Price must be > 0
- Shows success message on creation
- Refreshes product list
- Displays error if API fails

---

**Task 3.3**: Edit Product Modal
- [ ] `components/provider/EditProductModal.tsx`
- [ ] Pre-populated form with current product data
- [ ] Can update all fields except status
- [ ] Cannot edit sold products (show read-only view)

**API Integration:**
- PUT `/api/v1/products/:id`

**Acceptance Criteria:**
- Shows current values in form
- Validates changes
- Disables form for sold products
- Updates list on success

---

**Task 3.4**: Delete Product Confirmation
- [ ] `components/provider/DeleteProductDialog.tsx`
- [ ] Warning dialog before deletion
- [ ] Cannot delete sold products

**API Integration:**
- DELETE `/api/v1/products/:id`

**Acceptance Criteria:**
- Shows confirmation: "Are you sure you want to delete [Product Name]?"
- Disabled for sold products
- Removes from list on success

---

**Task 3.5**: Sales History Page
- [ ] `app/dashboard/provider/sales/page.tsx`
- [ ] Table of sold products
- [ ] Shows buyer info (masked), sale date, earnings, commission

**API Integration:**
- GET `/api/v1/purchases` (filter by providerId)

**Acceptance Criteria:**
- Shows product, price, commission, net earnings
- Date filter (last 7 days, 30 days, all time)
- Displays total earnings summary

---

### Testing Requirements (Epic 3)

**Unit Tests:**
- [ ] Product form validation
- [ ] Price calculation logic
- [ ] Status filtering

**Integration Tests:**
- [ ] Create product flow (form → API → list update)
- [ ] Edit product flow
- [ ] Delete product flow
- [ ] Cannot edit/delete sold products

**E2E Tests:**
- [ ] Full CRUD cycle for products
- [ ] View sales history

---

## Epic 4: Seller Dashboard

**Priority**: P0 (Core business flow)
**Estimated Time**: 6-7 days
**Dependencies**: Epic 1, Epic 3 (need products to exist)

### User Stories

**US-4.1**: As a seller, I want to browse available products in the marketplace
**US-4.2**: As a seller, I want to purchase a product with my wallet balance
**US-4.3**: As a seller, I want to view my purchase history
**US-4.4**: As a seller, I want to see my wallet balance
**US-4.5**: As a seller, I want to recharge my wallet (future)

### Tasks

**Task 4.1**: Marketplace Browse Page
- [ ] `app/dashboard/seller/marketplace/page.tsx`
- [ ] Grid/list view of available products
- [ ] Filter by category
- [ ] Price range filter
- [ ] Sort by price (low to high, high to low)
- [ ] Search functionality

**API Integration:**
- GET `/api/v1/products?status=available`

**Acceptance Criteria:**
- Shows product cards with category, price, masked email
- Filter sidebar with category checkboxes
- Price range slider
- Empty state if no products
- Product card has "Buy Now" button

---

**Task 4.2**: Product Purchase Flow
- [ ] `components/seller/PurchaseModal.tsx`
- [ ] Shows product details, price, current balance
- [ ] Warns if insufficient balance
- [ ] Confirms purchase
- [ ] Displays account credentials after purchase

**API Integration:**
- GET `/api/v1/wallets/balance`
- POST `/api/v1/purchases`

**CRITICAL UX:**
After successful purchase, display:
```
✅ Purchase Successful!

Account Credentials:
Email: account@netflix.com
Password: [SHOW ACTUAL PASSWORD]

⚠️ IMPORTANT: Save these credentials now!
They will NOT be shown again.

[Copy to Clipboard] [Download as Text]
```

**Acceptance Criteria:**
- Shows current balance vs product price
- Disables "Confirm" if balance insufficient
- Displays loading state during purchase
- Shows credentials in modal after success
- Provides copy and download options
- Cannot close modal without explicit confirmation

---

**Task 4.3**: My Purchases Page
- [ ] `app/dashboard/seller/purchases/page.tsx`
- [ ] Table of all purchases
- [ ] Click row to view details
- [ ] Shows masked credentials (email visible, password hidden)

**API Integration:**
- GET `/api/v1/purchases`

**Acceptance Criteria:**
- Shows purchase ID, product name, price, date
- Pagination
- Click row opens detail modal

---

**Task 4.4**: Purchase Detail Modal
- [ ] `components/seller/PurchaseDetailModal.tsx`
- [ ] Shows full purchase breakdown
- [ ] Displays decrypted account credentials
- [ ] Copy to clipboard functionality

**API Integration:**
- GET `/api/v1/purchases/:id`

**Acceptance Criteria:**
- Shows product details
- Displays account email and password (decrypted)
- Shows commission breakdown
- Copy buttons for email and password

---

**Task 4.5**: Wallet Balance Widget
- [ ] `components/seller/WalletBalance.tsx`
- [ ] Display current balance prominently
- [ ] Show currency (USD)
- [ ] "Recharge" button (future functionality)

**API Integration:**
- GET `/api/v1/wallets/balance`

**Placement:**
- Sidebar (persistent)
- Marketplace page (before purchase)
- Purchases page

**Acceptance Criteria:**
- Fetches balance on mount
- Updates after purchases
- Shows loading skeleton
- Error state if fetch fails

---

**Task 4.6**: Wallet Page
- [ ] `app/dashboard/seller/wallet/page.tsx`
- [ ] Current balance display
- [ ] Transaction history (future)
- [ ] Recharge form (future - placeholder)

**API Integration (Future):**
- POST `/api/v1/wallets/recharge`

---

### Testing Requirements (Epic 4)

**Unit Tests:**
- [ ] Price filter logic
- [ ] Balance comparison (sufficient/insufficient)
- [ ] Credential display/copy functions

**Integration Tests:**
- [ ] Browse products → filter → view
- [ ] Purchase flow (check balance → buy → receive credentials)
- [ ] View purchase history

**E2E Tests (Critical):**
- [ ] Complete purchase flow from login to credential retrieval
- [ ] Insufficient balance error handling
- [ ] Purchase history retrieval

---

## Epic 5: Affiliate Dashboard

**Priority**: P2 (Lower priority)
**Estimated Time**: 3-4 days
**Dependencies**: Epic 1

### User Stories

**US-5.1**: As an affiliate, I want to transfer money to other users
**US-5.2**: As an affiliate, I want to view my referral tree (future)

### Tasks

**Task 5.1**: P2P Transfer Page
- [ ] `app/dashboard/affiliate/transfer/page.tsx`
- [ ] Form: recipient user ID, amount, description
- [ ] Shows current balance
- [ ] Validates sufficient balance
- [ ] Confirms before transfer

**API Integration:**
- POST `/api/v1/wallets/transfer`

**Request Body:**
```json
{
  "toUserId": "cm1xyz789",
  "amount": 25.50,
  "description": "Payment for service"
}
```

**Acceptance Criteria:**
- Shows sender balance before transfer
- Validates toUserId (non-empty, not self)
- Amount > 0 and <= balance
- Shows updated balance after transfer
- Confirmation dialog

---

**Task 5.2**: Referral Tree (Future)
- [ ] `app/dashboard/affiliate/referrals/page.tsx`
- [ ] Display referral tree visualization
- [ ] Show commission earned per referral

**API Integration (Future):**
- GET `/api/affiliates/referrals`

---

### Testing Requirements (Epic 5)

**Unit Tests:**
- [ ] Transfer form validation
- [ ] Balance check logic

**Integration Tests:**
- [ ] Transfer flow (form → API → balance update)

---

## Epic 6: Conciliator Dashboard

**Priority**: P3 (Future implementation)
**Estimated Time**: 5-6 days
**Dependencies**: Epic 1, Disputes API (not yet implemented)

### User Stories

**US-6.1**: As a conciliator, I want to view open disputes
**US-6.2**: As a conciliator, I want to communicate with parties in a dispute
**US-6.3**: As a conciliator, I want to resolve disputes

### Tasks (Placeholder)

**Task 6.1**: Disputes List Page
- [ ] `app/dashboard/conciliator/disputes/page.tsx`

**Task 6.2**: Dispute Detail Page
- [ ] Chat interface
- [ ] Resolution form

**API Integration (Future):**
- GET `/api/disputes`
- POST `/api/disputes/:id/message`
- POST `/api/disputes/:id/resolve`

---

## Technical Architecture

### Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Shadcn/ui (recommended)
- **State Management**: React Context + React Query (recommended)
- **Forms**: React Hook Form + Zod
- **HTTP Client**: Fetch API with custom wrapper
- **Testing**: Jest + React Testing Library + Playwright

---

### Recommended UI Libraries

**Option 1: Shadcn/ui** (Recommended)
- Pros: Highly customizable, Tailwind-based, modern
- Components: Button, Dialog, Form, Table, Tabs, etc.
- Installation: `npx shadcn-ui@latest init`

**Option 2: Material-UI (MUI)**
- Pros: Comprehensive, battle-tested
- Cons: Heavier bundle size

**Option 3: Ant Design**
- Pros: Rich component library, great for dashboards
- Cons: Opinionated design

---

### State Management Strategy

**User Authentication State:**
- Store in React Context (`AuthContext`)
- Provides: `user`, `token`, `login()`, `logout()`, `isAuthenticated`

**Server State (API Data):**
- Use **React Query** (TanStack Query)
- Benefits: Caching, automatic refetching, optimistic updates
- Example:
```typescript
const { data: products, isLoading } = useQuery({
  queryKey: ['products', { category }],
  queryFn: () => fetchProducts({ category })
});
```

**Local UI State:**
- Use `useState` for component-level state (modals, forms)

---

### API Client Wrapper

Create `/lib/api.ts`:

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function apiClient<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const token = localStorage.getItem('token');

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API Error');
  }

  return response.json();
}
```

---

### Directory Structure

```
src/
├── app/
│   ├── login/
│   │   └── page.tsx
│   ├── register/
│   │   └── page.tsx
│   └── dashboard/
│       ├── admin/
│       │   ├── layout.tsx
│       │   ├── users/page.tsx
│       │   ├── commissions/page.tsx
│       │   └── analytics/page.tsx
│       ├── provider/
│       │   ├── layout.tsx
│       │   ├── products/page.tsx
│       │   └── sales/page.tsx
│       ├── seller/
│       │   ├── layout.tsx
│       │   ├── marketplace/page.tsx
│       │   ├── purchases/page.tsx
│       │   └── wallet/page.tsx
│       ├── affiliate/
│       │   ├── layout.tsx
│       │   ├── transfer/page.tsx
│       │   └── referrals/page.tsx
│       └── conciliator/
│           ├── layout.tsx
│           └── disputes/page.tsx
├── components/
│   ├── auth/
│   │   └── ProtectedRoute.tsx
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   └── Header.tsx
│   ├── admin/
│   │   └── UserEditModal.tsx
│   ├── provider/
│   │   ├── CreateProductModal.tsx
│   │   ├── EditProductModal.tsx
│   │   └── DeleteProductDialog.tsx
│   ├── seller/
│   │   ├── ProductCard.tsx
│   │   ├── PurchaseModal.tsx
│   │   ├── PurchaseDetailModal.tsx
│   │   └── WalletBalance.tsx
│   └── shared/
│       ├── DataTable.tsx
│       ├── LoadingSpinner.tsx
│       └── ErrorMessage.tsx
├── lib/
│   ├── api.ts
│   ├── auth.ts
│   └── utils.ts
├── hooks/
│   ├── useAuth.ts
│   ├── useProducts.ts
│   ├── useWallet.ts
│   └── usePurchases.ts
├── types/
│   ├── user.ts
│   ├── product.ts
│   ├── purchase.ts
│   └── wallet.ts
└── context/
    └── AuthContext.tsx
```

---

## Quality Gates

All epics must pass these gates before moving to the next:

### Code Quality
- [ ] ESLint: No errors, max 5 warnings
- [ ] TypeScript: No `any` types in production code
- [ ] Code Review: Approved by coordinator

### Testing
- [ ] Unit Tests: Coverage > 70%
- [ ] Integration Tests: All critical paths covered
- [ ] E2E Tests: Happy path + error scenarios

### Functionality
- [ ] All user stories completed
- [ ] All acceptance criteria met
- [ ] Error handling implemented
- [ ] Loading states implemented

### UX/UI
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Accessibility: Keyboard navigation, ARIA labels
- [ ] Loading spinners for async operations
- [ ] Toast notifications for success/error

### Security
- [ ] No sensitive data in console logs
- [ ] JWT token stored securely
- [ ] Input validation on forms
- [ ] XSS prevention (sanitize user input)

---

## Sprint Schedule (Weeks 4-5)

### Week 4: Core Features

**Days 1-2: Epic 1 (Authentication)**
- Mon: Login/Register pages
- Tue: Protected routes, token management

**Days 3-4: Epic 4 Start (Seller Dashboard - Critical Path)**
- Wed: Marketplace browse page
- Thu: Purchase flow (part 1)

**Day 5: Epic 4 Continued**
- Fri: Complete purchase flow with credentials display

---

### Week 5: Role-Specific Dashboards

**Days 1-2: Epic 3 (Provider Dashboard)**
- Mon: Product CRUD operations
- Tue: Sales history

**Days 3-4: Epic 2 & 5**
- Wed: Admin dashboard (user management, commissions)
- Thu: Affiliate dashboard (transfers)

**Day 5: Polish & Testing**
- Fri: Bug fixes, E2E tests, final review

---

## Coordination Points

### Daily Standups (10 min)
- **Time**: 9:00 AM daily
- **Attendees**: Frontend, Coordinator, QA
- **Format**:
  - What did I complete yesterday?
  - What will I work on today?
  - Any blockers?

### Backend Support Sessions (2x/week)
- **Time**: Tuesday & Thursday, 2:00 PM
- **Purpose**: Resolve API questions, test endpoint behavior

### Code Reviews
- **Frequency**: End of each epic
- **Reviewers**: Coordinator + Frontend Lead
- **Criteria**: Quality gates checklist

### QA Handoff
- **Frequency**: After each epic completion
- **Process**:
  1. Frontend creates pull request
  2. QA reviews and tests
  3. QA reports bugs
  4. Frontend fixes and re-submits

---

## Risks & Mitigation

### Risk 1: API Endpoints Not Yet Implemented
**Impact**: Cannot complete Epic 2 (Admin) and Epic 6 (Conciliator) fully
**Mitigation**:
- Use mock data for UI development
- Create API contracts based on database schema
- Build UI now, connect to real API later

### Risk 2: Credential Security in Purchase Flow
**Impact**: Sensitive data exposure if not handled correctly
**Mitigation**:
- Never log passwords to console
- Clear clipboard after 30 seconds (optional)
- Implement "Are you sure?" before closing credentials modal

### Risk 3: Token Expiration During Active Session
**Impact**: User forcibly logged out while working
**Mitigation**:
- Implement token refresh logic
- Warn user 5 minutes before expiration
- Auto-refresh if user is active

### Risk 4: State Synchronization (Balance Updates)
**Impact**: UI shows stale balance after purchase
**Mitigation**:
- Use React Query invalidation after mutations
- Optimistic updates for instant feedback
- Refetch balance on focus/visibility change

---

## Success Metrics

### Completion Criteria
- [ ] All 6 dashboards implemented and functional
- [ ] All API endpoints integrated (except future ones)
- [ ] 398 backend tests + 100+ frontend tests passing
- [ ] All quality gates passed
- [ ] Responsive design tested on 3 device sizes
- [ ] Accessibility audit passed (Lighthouse score > 90)

### Performance Targets
- [ ] Page load time < 2 seconds
- [ ] API response time < 500ms (backend already optimized)
- [ ] No memory leaks in long-running sessions
- [ ] Bundle size < 500KB (gzipped)

---

## Next Steps

1. **Review this plan** with frontend-dashboard-builder agent
2. **Choose UI library** (Shadcn/ui recommended)
3. **Set up project** (Tailwind, React Query, React Hook Form)
4. **Create git branch**: `feature/frontend-ui`
5. **Start Epic 1** (Authentication)

---

**Questions? Contact the Project Coordinator.**
