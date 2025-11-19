# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Stream Sales is a Next.js 14 application with DDD (Domain-Driven Design) architecture, implementing authentication and dashboard functionality with PostgreSQL, Prisma ORM, and JWT tokens.

## Commands

### Development
```bash
npm run dev              # Start development server (http://localhost:3000)
npm run build            # Build for production
npm start                # Start production server
npm run lint             # Run ESLint
```

### Testing
```bash
npm test                 # Run all tests with Jest
npm run test:watch       # Run tests in watch mode
npm run test:db          # Test database connection (local or AWS)
```

### Database (Prisma)
```bash
npm run prisma:generate  # Generate Prisma Client (run after schema changes)
npm run prisma:migrate   # Create and apply migrations
npm run prisma:studio    # Open Prisma Studio GUI to view/edit data
npm run test:db          # Test database connection with comprehensive suite
```

### Maintenance Scripts
```bash
npm run seed:admin                  # Create admin user with wallet (REQUIRED for purchases)
npm run seed:commission-config      # Initialize commission configuration (5% sale, 0% registration)
npm run migrate:encrypt-passwords   # Re-encrypt product passwords (see scripts/README.md)
```

**Important**: Before running maintenance scripts:
1. Always backup your database first
2. Review the script documentation in `scripts/README.md`
3. Ensure environment variables are properly configured

**First-time Setup**:
1. Run `npm run seed:admin` before making any purchases in the system
2. Run `npm run seed:commission-config` to initialize commission rates (optional, defaults to 5%)

## Architecture

This project follows **Domain-Driven Design (DDD)** with strict separation of concerns:

### Layer Structure

```
src/
├── domain/              # Core business logic (framework-agnostic)
│   ├── entities/        # Business entities with behavior (e.g., User)
│   ├── value-objects/   # Immutable value types with validation (e.g., Email, Password)
│   ├── repositories/    # Repository interfaces (contracts)
│   └── exceptions/      # Domain-specific exceptions
├── application/         # Application business rules
│   └── use-cases/       # Use case implementations (orchestrate domain)
├── infrastructure/      # External concerns and implementations
│   ├── database/        # Prisma client singleton
│   ├── repositories/    # Repository implementations (PrismaUserRepository)
│   └── auth/           # JWT service and middleware
└── app/                # Next.js App Router (presentation layer)
    ├── api/            # API route handlers
    ├── login/          # Login page
    ├── register/       # Registration page
    └── dashboard/      # Protected dashboard page
```

### Key Architectural Principles

1. **Dependency Rule**: Dependencies point inward. Domain has no external dependencies. Application depends on Domain. Infrastructure depends on Domain and Application.

2. **Value Objects**: Email and Password are Value Objects with built-in validation:
   - `Email.create(string)` - Validates format, normalizes to lowercase
   - `Password.create(string)` - Validates length (min 6), hashes with bcrypt
   - Both are immutable and enforce business rules

3. **Entity Pattern**: `User` entity:
   - Created via `User.create()` factory (generates UUID, timestamps)
   - Reconstructed from persistence via `User.fromPersistence()`
   - Encapsulates user behavior (updateName, verifyPassword)

4. **Repository Pattern**:
   - Interfaces defined in domain layer (`IUserRepository`)
   - Implementations in infrastructure (`PrismaUserRepository`)
   - Use cases depend on interfaces, not concrete implementations

5. **Use Cases**: Each use case is a single business operation:
   - `RegisterUserUseCase` - User registration with validation
   - `LoginUserUseCase` - Authentication with credentials
   - `GetUserByIdUseCase` - Retrieve user by ID

## Authentication Flow

### Critical Edge Runtime Issue

**IMPORTANT**: Next.js middleware runs in Edge Runtime which does NOT support Node.js `crypto` module (required by `jsonwebtoken`). Current solution:

1. **Middleware** (`src/middleware.ts`): Only checks cookie existence for `/dashboard` routes. Does NOT validate JWT.
2. **API Routes** (`src/app/api/auth/me/route.ts`): Validates JWT in Node.js runtime.
3. **Client** (`src/app/dashboard/page.tsx`): Calls `/api/auth/me` to validate token and fetch user data.

### Token Management

- **Server-side cookie**: Set in `/api/auth/login` and `/api/auth/register` responses
  - 7-day expiration
  - SameSite=Lax
  - Secure flag in production
  - NOT httpOnly (to allow localStorage sync)

- **localStorage**: Token also stored client-side for Authorization headers

- **Authorization header**: Dashboard sends `Authorization: Bearer <token>` to `/api/auth/me`

### Adding Protected Routes

To protect a new route:
1. Add pattern to middleware matcher in `src/middleware.ts`
2. Ensure route checks for token cookie (middleware) or validates JWT in API handler

## Database

- **Provider**: PostgreSQL (configured in `prisma/schema.prisma`)
- **Connection**: Environment-aware (see Database Infrastructure below)
- **ORM**: Prisma Client with AWS Secrets Manager integration

### Database Infrastructure

The Prisma client initialization supports both local development and production AWS deployments:

**Development Mode** (default):
- Uses `DATABASE_URL` from `.env` file
- Direct PostgreSQL connection
- Query logging enabled

**Production Mode** (AWS):
- Retrieves credentials from AWS Secrets Manager
- Automatic retry logic with exponential backoff
- Connection pooling optimized for serverless (5 connections)
- SSL/TLS encryption enforced

**Configuration:**
```env
# Development
DATABASE_URL="postgresql://user:pass@localhost:5432/streams?schema=public"

# Production
NODE_ENV=production
AWS_SECRET_NAME="stream-sales/database/credentials"
AWS_REGION="us-east-1"
```

**Testing Database Connection:**
```bash
# Test local connection
npm run test:db

# Test AWS Secrets Manager integration
NODE_ENV=production AWS_SECRET_NAME=your-secret npm run test:db
```

**Key Features:**
- Singleton pattern prevents connection leaks during Next.js hot reload
- Graceful shutdown with automatic connection cleanup
- Connection retry logic (3 attempts with exponential backoff)
- Comprehensive error handling and logging
- Type-safe configuration with TypeScript interfaces

**Documentation:**
- Implementation: `src/infrastructure/database/prisma.ts`
- Type definitions: `src/infrastructure/database/types.ts`
- Usage guide: `src/infrastructure/database/README.md`
- CDK integration: `src/infrastructure/database/CDK_INTEGRATION.md`

### Database Workflow

1. Modify `prisma/schema.prisma`
2. Run `npm run prisma:migrate` to create migration
3. Run `npm run prisma:generate` to update Prisma Client types
4. Update domain entities and repositories as needed
5. Test connection: `npm run test:db`

## Testing

### Test Structure

Tests are co-located with source code in `__tests__` directories:
```
src/domain/entities/__tests__/User.test.ts
src/domain/value-objects/__tests__/Email.test.ts
src/application/use-cases/__tests__/RegisterUserUseCase.test.ts
```

### Jest Configuration

- **Environment**: jsdom (for React component testing)
- **Setup**: `jest.setup.js` includes:
  - `@testing-library/jest-dom`
  - crypto.randomUUID polyfill for Node.js compatibility
- **Path aliases**: `@/`, `@/domain/`, `@/application/`, `@/infrastructure/`

### Running Specific Tests

```bash
npm test User.test.ts           # Run specific test file
npm test -- --watch User        # Watch mode for User tests
npm test -- --coverage          # Run with coverage report
```

## Environment Variables

### Development (.env)
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/streams?schema=public"

# JWT Authentication
JWT_SECRET="your-secret-key-change-this-in-production"
JWT_EXPIRES_IN="7d"  # Token expiration (e.g., 7d, 24h, 60m)

# Environment
NODE_ENV="development"
```

### Production (AWS Lambda/ECS)
```env
# Database (AWS Secrets Manager)
NODE_ENV=production
AWS_SECRET_NAME="stream-sales/database/credentials"
AWS_REGION="us-east-1"

# JWT Authentication (store in separate secret)
JWT_SECRET="your-production-secret"
JWT_EXPIRES_IN="7d"
```

**AWS Secrets Manager Secret Format:**
```json
{
  "host": "stream-sales-db.abc123.us-east-1.rds.amazonaws.com",
  "port": "5432",
  "username": "dbadmin",
  "password": "SecurePassword123!",
  "dbname": "streams",
  "engine": "postgres"
}
```

## Common Issues & Solutions

### Issue: JWT validation fails in middleware
**Cause**: Edge Runtime doesn't support Node.js crypto module
**Solution**: Validate JWT in API routes (Node.js runtime), not in middleware

### Issue: Tests fail with "crypto.randomUUID is not a function"
**Cause**: Jest environment doesn't have Node.js crypto by default
**Solution**: Already fixed in `jest.setup.js` with polyfill

### Issue: Prisma Client not found
**Cause**: Prisma Client not generated after schema changes
**Solution**: Run `npm run prisma:generate`

### Issue: Database connection error
**Cause**: PostgreSQL not running or wrong DATABASE_URL
**Solution**: Ensure PostgreSQL is running and DATABASE_URL is correct

### Issue: "Invalid encrypted format" error when purchasing products
**Cause**: Products created before encryption system have passwords in plain text
**Solution**:
1. **Immediate fix**: Already implemented - `PrismaProductRepository.decrypt()` now handles both encrypted and plain text passwords
2. **Long-term fix**: Run migration script to encrypt all passwords:
   ```bash
   npm run migrate:encrypt-passwords
   ```
3. **Details**: See `scripts/README.md` for complete migration guide

**Technical Details**:
- Product passwords are encrypted using AES-256-CBC
- Format: `{iv_hex}:{encrypted_data_hex}`
- The decrypt method now:
  - Detects if password is already encrypted (contains `:`)
  - Returns plain text passwords as-is (backward compatibility)
  - Logs warnings for unencrypted passwords
- New products are always saved with encrypted passwords
- Migration script is idempotent and safe to run multiple times

### Issue: "Admin wallet not found" error when purchasing products
**Cause**: The system requires an admin user with wallet to receive commission payments
**Solution**:
```bash
npm run seed:admin
```

**Why this happens**:
- When a seller purchases a product, the system splits the payment:
  - 5% commission → Admin wallet
  - 95% earnings → Provider wallet
- Without an admin wallet, the transaction cannot complete

**What the seed script does**:
1. Creates admin user with email: `admin@streamsales.com`
2. Creates wallet for admin with $0 initial balance
3. Password: `admin123` (change after first login)

**Important**: This is a **required** step for new installations before making any purchases.

## Commission System

The application uses a **dynamic commission configuration** system that allows admins to adjust commission rates without code changes.

### How It Works

**Commission Flow** (example with 5% commission on $15.99 purchase):
```
Seller pays: $15.99 (full price)
    ↓
Admin receives: $0.80 (5% commission)
Provider receives: $15.19 (95% earnings)
```

**Key Components**:
- **CommissionConfig Entity** (`src/domain/entities/CommissionConfig.ts`): Domain model for commission configuration
- **CommissionConfigRepository** (`src/infrastructure/repositories/PrismaCommissionConfigRepository.ts`): Data access layer
- **Use Cases**:
  - `GetActiveCommissionConfigUseCase`: Retrieves current active commission rate
  - `UpdateCommissionConfigUseCase`: Updates commission configuration with audit trail
- **PurchaseProductUseCase** (`src/application/use-cases/PurchaseProductUseCase.ts:203`): Now reads commission rate from database instead of hardcoded value

### Commission Types

1. **Sale Commission** (default: 5%): Applied when a seller purchases a product
2. **Registration Commission** (default: 0%): Applied when new users register via affiliate referral

### Admin Configuration

Admins can configure commissions via:
- **Dashboard**: `/dashboard/admin/commissions`
- **API Endpoints**:
  - `GET /api/admin/commissions` - Get current configuration
  - `PUT /api/admin/commissions` - Update rates (0-100%)
  - `GET /api/admin/commissions/history` - View all changes

### Database Schema

**CommissionConfig Table**:
```prisma
- id: String (cuid)
- type: 'sale' | 'registration'
- rate: Decimal (0-100, e.g., 5.50 = 5.5%)
- isActive: Boolean
- effectiveFrom: DateTime
- createdAt: DateTime
- updatedAt: DateTime
```

**Important Features**:
- **Audit Trail**: Every commission change creates a new record, old configs are deactivated (not deleted)
- **Snapshot on Purchase**: Commission rate is captured at purchase time, never changes retroactively
- **Fallback**: If no active config exists, defaults to 5% (see `PurchaseProductUseCase.ts:89`)

### Initialization

Run this after first installation:
```bash
npm run seed:commission-config
```

This creates default configurations:
- Sale commission: 5.00%
- Registration commission: 0.00%

## TypeScript Path Aliases

Configured in `tsconfig.json` and `jest.config.js`:
- `@/*` → `./src/*`
- `@/domain/*` → `./src/domain/*`
- `@/application/*` → `./src/application/*`
- `@/infrastructure/*` → `./src/infrastructure/*`

Use these consistently throughout the codebase for clean imports.

## API Endpoints

### POST /api/auth/register
- Creates new user account
- Validates email format and password length
- Returns user object and JWT token
- Sets authentication cookie

### POST /api/auth/login
- Authenticates user with email/password
- Returns user object and JWT token
- Sets authentication cookie

### GET /api/auth/me
- Requires `Authorization: Bearer <token>` header
- Validates JWT in Node.js runtime
- Returns current user data from database
- Used by dashboard to verify authentication

## Adding New Features

### New Entity
1. Create entity in `src/domain/entities/`
2. Add repository interface in `src/domain/repositories/`
3. Implement repository in `src/infrastructure/repositories/`
4. Add Prisma model in `prisma/schema.prisma`
5. Run migrations and generate client

### New Use Case
1. Create use case in `src/application/use-cases/`
2. Define DTO types for input/output
3. Inject repository dependencies via constructor
4. Write unit tests in `__tests__/` directory

### New API Endpoint
1. Create route handler in `src/app/api/`
2. Instantiate required use cases and repositories
3. Handle errors with appropriate HTTP status codes
4. For protected endpoints, validate JWT token

## Code Style Notes

- Value Objects validate in their factory methods (`create()`)
- Entities use factory pattern for creation, separate method for persistence reconstruction
- Use cases are the ONLY place where repositories are called
- API routes are thin controllers that delegate to use cases
- Never bypass domain validation by directly constructing entities
