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
```

### Database (Prisma)
```bash
npm run prisma:generate  # Generate Prisma Client (run after schema changes)
npm run prisma:migrate   # Create and apply migrations
npm run prisma:studio    # Open Prisma Studio GUI to view/edit data
```

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
- **Connection**: `DATABASE_URL` environment variable
- **Schema**: Single `User` table with:
  - `id` (String, cuid)
  - `email` (String, unique)
  - `password` (String, bcrypt hashed)
  - `name` (String?, optional)
  - `role` (String, default "user")
  - `createdAt`, `updatedAt` (DateTime)

### Database Workflow

1. Modify `prisma/schema.prisma`
2. Run `npm run prisma:migrate` to create migration
3. Run `npm run prisma:generate` to update Prisma Client types
4. Update domain entities and repositories as needed

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

Required in `.env`:
```
DATABASE_URL="postgresql://user:password@localhost:5432/dbname?schema=public"
JWT_SECRET="your-secret-key-change-this-in-production"
JWT_EXPIRES_IN="7d"  # Token expiration (e.g., 7d, 24h, 60m)
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
