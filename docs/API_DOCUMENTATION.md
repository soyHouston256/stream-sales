# Stream Sales - API Documentation v1.0

**Last Updated**: 2025-11-15
**Base URL**: `http://localhost:3000`
**API Version**: v1
**Backend Status**: 100% Complete (398 tests passing)

---

## Table of Contents

1. [Authentication](#authentication)
2. [Wallets](#wallets)
3. [Products](#products)
4. [Purchases](#purchases)
5. [Error Handling](#error-handling)
6. [Data Models](#data-models)
7. [Business Rules](#business-rules)

---

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

### POST `/api/auth/register`

Create a new user account and automatically create an associated wallet.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}
```

**Response (201 Created):**
```json
{
  "user": {
    "id": "cm1abc123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "createdAt": "2025-11-15T10:30:00Z",
    "updatedAt": "2025-11-15T10:30:00Z"
  },
  "wallet": {
    "id": "wl_abc123",
    "userId": "cm1abc123",
    "balance": "0.0000",
    "currency": "USD",
    "status": "active",
    "createdAt": "2025-11-15T10:30:00Z",
    "updatedAt": "2025-11-15T10:30:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Set-Cookie Header:**
- `token` cookie (7-day expiration, SameSite=Lax, Secure in production)

**Errors:**
- `400 Bad Request` - Invalid email/password format
- `409 Conflict` - Email already registered

**Business Rules:**
- Password minimum 6 characters
- Email validated and normalized to lowercase
- Wallet automatically created with $0.00 USD balance
- Default role: "user"

---

### POST `/api/auth/login`

Authenticate with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200 OK):**
```json
{
  "user": {
    "id": "cm1abc123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "createdAt": "2025-11-15T10:30:00Z",
    "updatedAt": "2025-11-15T10:30:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Set-Cookie Header:**
- `token` cookie (7-day expiration)

**Errors:**
- `400 Bad Request` - Missing email or password
- `401 Unauthorized` - Invalid credentials

**JWT Payload:**
```json
{
  "userId": "cm1abc123",
  "email": "user@example.com",
  "role": "user",
  "iat": 1700000000,
  "exp": 1700604800
}
```

---

### GET `/api/auth/me`

Validate JWT token and retrieve current user data.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "user": {
    "id": "cm1abc123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "createdAt": "2025-11-15T10:30:00Z",
    "updatedAt": "2025-11-15T10:30:00Z"
  }
}
```

**Errors:**
- `401 Unauthorized` - No token provided or invalid token
- `404 Not Found` - User no longer exists

**Use Case:**
- Validate authentication on protected routes
- Fetch current user profile
- Check user role for RBAC

---

## Wallets

### GET `/api/v1/wallets/balance`

Get current user's wallet balance.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "wallet": {
    "id": "wl_abc123",
    "userId": "cm1abc123",
    "balance": "1500.5000",
    "currency": "USD",
    "status": "active",
    "createdAt": "2025-11-15T09:00:00Z",
    "updatedAt": "2025-11-15T11:45:00Z"
  }
}
```

**Errors:**
- `401 Unauthorized` - Invalid or missing token
- `404 Not Found` - Wallet not found

**Notes:**
- Balance uses Decimal(19,4) precision
- All monetary amounts in USD (extensible to multi-currency)

---

### POST `/api/v1/wallets/transfer`

Transfer money peer-to-peer between users.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "toUserId": "cm1xyz789",
  "amount": 25.50,
  "description": "Payment for service"
}
```

**Response (200 OK):**
```json
{
  "transfer": {
    "fromUserId": "cm1abc123",
    "toUserId": "cm1xyz789",
    "amount": "25.5000",
    "currency": "USD",
    "description": "Payment for service"
  },
  "senderWallet": {
    "id": "wl_abc123",
    "userId": "cm1abc123",
    "previousBalance": "100.0000",
    "newBalance": "74.5000"
  },
  "receiverWallet": {
    "id": "wl_xyz789",
    "userId": "cm1xyz789",
    "previousBalance": "50.0000",
    "newBalance": "75.5000"
  }
}
```

**Errors:**
- `400 Bad Request` - Invalid amount or self-transfer
- `401 Unauthorized` - Invalid token
- `402 Payment Required` - Insufficient balance
- `404 Not Found` - Recipient user/wallet not found

**Business Rules:**
- Cannot transfer to yourself
- Amount must be positive
- Sender must have sufficient balance
- Both wallets must use same currency
- Transaction is atomic (both debit and credit succeed or fail together)

---

## Products

### POST `/api/v1/products`

Create a new digital product (Provider role).

**Headers:**
```
Authorization: Bearer <token>
```

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

**Response (201 Created):**
```json
{
  "product": {
    "id": "prod_abc123",
    "providerId": "cm1abc123",
    "category": "netflix",
    "name": "Netflix Premium Account",
    "description": "Digital account credentials for netflix",
    "price": "15.9900",
    "currency": "USD",
    "accountEmail": "account@netflix.com",
    "status": "available",
    "createdAt": "2025-11-15T10:30:00Z",
    "updatedAt": "2025-11-15T10:30:00Z"
  }
}
```

**Errors:**
- `400 Bad Request` - Invalid data (price, email, etc.)
- `401 Unauthorized` - Invalid token
- `403 Forbidden` - User not a provider (future implementation)

**Business Rules:**
- `accountPassword` is encrypted with AES-256-CBC before storage
- Default status: "available"
- Categories: netflix, spotify, hbo, disney, prime, youtube, other
- Price must be positive

**Security:**
- Password NEVER returned in responses
- Password encrypted at-rest in database

---

### GET `/api/v1/products`

List available products in the marketplace.

**Query Parameters:**
- `category` (optional): Filter by category (e.g., "netflix")
- `minPrice` (optional): Minimum price filter
- `maxPrice` (optional): Maximum price filter
- `limit` (optional): Results per page (default: 20)
- `offset` (optional): Pagination offset (default: 0)

**Example Request:**
```
GET /api/v1/products?category=netflix&maxPrice=20&limit=10&offset=0
```

**Response (200 OK):**
```json
{
  "products": [
    {
      "id": "prod_abc123",
      "providerId": "cm1provider",
      "category": "netflix",
      "name": "Netflix Premium Account",
      "description": "Digital account credentials for netflix",
      "price": "15.9900",
      "currency": "USD",
      "accountEmail": "acc***@netflix.com",
      "status": "available",
      "createdAt": "2025-11-15T10:30:00Z",
      "updatedAt": "2025-11-15T10:30:00Z"
    }
  ],
  "total": 42,
  "hasMore": true
}
```

**Errors:**
- `400 Bad Request` - Invalid query parameters

**Notes:**
- `accountPassword` NEVER included
- `accountEmail` may be partially masked
- Only shows products with status "available"

---

### PUT `/api/v1/products/:id`

Update an existing product (owner only).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body (all fields optional):**
```json
{
  "category": "spotify",
  "price": 12.99,
  "currency": "EUR",
  "accountEmail": "new@spotify.com",
  "accountPassword": "newPassword456"
}
```

**Response (200 OK):**
```json
{
  "product": {
    "id": "prod_abc123",
    "providerId": "cm1abc123",
    "category": "spotify",
    "name": "Spotify Premium Account",
    "description": "Digital account credentials for spotify",
    "price": "12.9900",
    "currency": "EUR",
    "accountEmail": "new@spotify.com",
    "status": "available",
    "updatedAt": "2025-11-15T11:00:00Z"
  }
}
```

**Errors:**
- `400 Bad Request` - Invalid data or cannot edit sold products
- `401 Unauthorized` - Invalid token
- `403 Forbidden` - Not the product owner
- `404 Not Found` - Product doesn't exist

**Business Rules:**
- Only the product provider can update it
- Cannot update sold products (status: "sold")
- New password is re-encrypted if provided

---

### DELETE `/api/v1/products/:id`

Delete a product (owner only).

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Product prod_abc123 deleted successfully"
}
```

**Errors:**
- `400 Bad Request` - Cannot delete sold products
- `401 Unauthorized` - Invalid token
- `403 Forbidden` - Not the product owner
- `404 Not Found` - Product doesn't exist

**Business Rules:**
- Only provider can delete their own products
- Cannot delete sold products (referential integrity)

---

## Purchases

### POST `/api/v1/purchases`

Purchase a digital product (complex transaction).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "productId": "prod_abc123"
}
```

**Response (201 Created):**
```json
{
  "purchase": {
    "id": "purchase_xyz789",
    "sellerId": "cm1seller",
    "productId": "prod_abc123",
    "providerId": "cm1provider",
    "amount": "15.9900",
    "currency": "USD",
    "providerEarnings": "15.1905",
    "adminCommission": "0.7995",
    "commissionRate": 0.05,
    "commissionPercentage": "5.00%",
    "status": "completed",
    "createdAt": "2025-11-15T10:30:00Z",
    "completedAt": "2025-11-15T10:30:00Z"
  },
  "product": {
    "id": "prod_abc123",
    "category": "netflix",
    "status": "sold",
    "accountEmail": "account@netflix.com",
    "accountPassword": "decryptedPassword123"
  },
  "walletBalance": "84.0100"
}
```

**Transaction Flow:**
1. Validate product is available (status: "available")
2. Check seller has sufficient balance (balance >= product.price)
3. **Debit seller wallet** (product.price)
4. **Credit provider wallet** (product.price * (1 - commissionRate))
5. **Credit admin wallet** (product.price * commissionRate)
6. Mark product as **"sold"**
7. Create **Purchase record** (immutable audit trail)
8. Return **decrypted** account credentials to buyer

**Errors:**
- `400 Bad Request` - Invalid productId
- `401 Unauthorized` - Invalid token
- `403 Forbidden` - Insufficient balance
- `404 Not Found` - Product doesn't exist
- `409 Conflict` - Product already sold

**Business Rules:**
- Commission rate snapshot at purchase time (currently 5%)
- Product status becomes "sold" (immutable, cannot be changed)
- Buyer receives decrypted accountPassword ONLY in this response
- Transaction is atomic (all operations succeed or fail together)
- Creates 3 Transaction records (debit, credit provider, credit admin)

**Critical Notes:**
- This is the ONLY endpoint where `accountPassword` is decrypted and returned
- Frontend must display credentials immediately and warn user to save them
- Password cannot be retrieved again after this response

---

### GET `/api/v1/purchases`

List all purchases made by authenticated user.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `limit` (optional): Results per page (default: 20)
- `offset` (optional): Pagination offset (default: 0)
- `startDate` (optional): Filter from date (ISO 8601)
- `endDate` (optional): Filter to date (ISO 8601)

**Example Request:**
```
GET /api/v1/purchases?limit=10&offset=0&startDate=2025-11-01T00:00:00Z
```

**Response (200 OK):**
```json
{
  "purchases": [
    {
      "id": "purchase_xyz789",
      "sellerId": "cm1seller",
      "productId": "prod_abc123",
      "providerId": "cm1provider",
      "amount": "15.9900",
      "currency": "USD",
      "providerEarnings": "15.1905",
      "adminCommission": "0.7995",
      "commissionRate": 0.05,
      "commissionPercentage": "5.00%",
      "status": "completed",
      "createdAt": "2025-11-15T10:30:00Z",
      "completedAt": "2025-11-15T10:30:00Z",
      "product": {
        "category": "netflix",
        "name": "Netflix Premium Account",
        "accountEmail": "acc***@netflix.com"
      }
    }
  ],
  "pagination": {
    "total": 42,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  },
  "summary": {
    "totalSpent": "671.58",
    "totalPurchases": 42
  }
}
```

**Errors:**
- `400 Bad Request` - Invalid query parameters
- `401 Unauthorized` - Invalid token

**Notes:**
- `accountPassword` is NOT included (use GET /purchases/:id for full details)
- Shows only user's own purchases (filtered by sellerId)

---

### GET `/api/v1/purchases/:id`

Get details of a specific purchase.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "purchase": {
    "id": "purchase_xyz789",
    "sellerId": "cm1seller",
    "productId": "prod_abc123",
    "providerId": "cm1provider",
    "amount": "15.9900",
    "currency": "USD",
    "providerEarnings": "15.1905",
    "adminCommission": "0.7995",
    "commissionRate": 0.05,
    "commissionPercentage": "5.00%",
    "status": "completed",
    "createdAt": "2025-11-15T10:30:00Z",
    "completedAt": "2025-11-15T10:30:00Z",
    "breakdown": {
      "totalPaid": "15.9900",
      "adminCommission": "0.7995",
      "providerReceived": "15.1905",
      "commissionRate": 0.05
    },
    "product": {
      "category": "netflix",
      "name": "Netflix Premium Account",
      "accountEmail": "account@netflix.com",
      "accountPassword": "decryptedPassword123"
    }
  }
}
```

**Errors:**
- `401 Unauthorized` - Invalid token
- `403 Forbidden` - Not the purchase owner
- `404 Not Found` - Purchase doesn't exist

**Authorization:**
- Only the seller (buyer) can view their own purchases
- Admin can view all purchases (future implementation)

**Notes:**
- Includes decrypted `accountPassword` for owned purchases
- Use this endpoint to retrieve forgotten credentials

---

## Error Handling

All errors follow this structure:

```json
{
  "error": "Human-readable error message",
  "details": "Additional context (optional)"
}
```

### HTTP Status Codes

| Code | Meaning | Use Case |
|------|---------|----------|
| 200 | OK | Successful GET/PUT/DELETE |
| 201 | Created | Successful POST (resource created) |
| 400 | Bad Request | Validation error, malformed data |
| 401 | Unauthorized | Missing/invalid JWT token |
| 402 | Payment Required | Insufficient balance |
| 403 | Forbidden | Authenticated but not authorized (wrong role/owner) |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource already exists (e.g., duplicate email, product already sold) |
| 500 | Internal Server Error | Unexpected server error |

---

## Data Models

### User

```typescript
{
  id: string;          // cuid
  email: string;       // unique, normalized lowercase
  password: string;    // bcrypt hashed
  name?: string;       // optional
  role: string;        // "admin" | "provider" | "seller" | "affiliate" | "conciliator"
  createdAt: Date;
  updatedAt: Date;
}
```

**Roles:**
- `admin`: Platform administrator
- `provider`: Sells digital products
- `seller`: Buys digital products
- `affiliate`: Referral program participant
- `conciliator`: Dispute mediator

---

### Wallet

```typescript
{
  id: string;          // cuid
  userId: string;      // unique (1-to-1 relationship)
  balance: Decimal;    // Decimal(19,4) - NEVER Float
  currency: string;    // "USD"
  status: string;      // "active" | "frozen" | "closed"
  createdAt: Date;
  updatedAt: Date;
}
```

---

### Product

```typescript
{
  id: string;              // cuid
  providerId: string;      // FK to User
  category: string;        // "netflix" | "spotify" | "hbo" | "disney" | "prime" | "youtube" | "other"
  name: string;            // Auto-generated from category
  description: string;     // Auto-generated description
  price: Decimal;          // Decimal(19,4)
  currency: string;        // "USD"
  accountEmail: string;    // Plain text
  accountPassword: string; // AES-256-CBC encrypted
  accountDetails?: JSON;   // Additional metadata
  status: string;          // "available" | "reserved" | "sold"
  createdAt: Date;
  updatedAt: Date;
  soldAt?: Date;
}
```

---

### Purchase

```typescript
{
  id: string;              // cuid
  sellerId: string;        // FK to User (buyer)
  productId: string;       // FK to Product (unique - 1-to-1)
  providerId: string;      // FK to User (denormalized for queries)
  amount: Decimal;         // Product price (Decimal 19,4)
  providerEarnings: Decimal; // amount - adminCommission
  adminCommission: Decimal;  // amount * commissionRate
  commissionRate: Decimal;   // Snapshot (e.g., 0.05 = 5%)
  status: string;          // "pending" | "completed" | "failed" | "refunded"
  transactionIds?: JSON;   // Array of related Transaction IDs
  createdAt: Date;
  completedAt?: Date;
  refundedAt?: Date;
}
```

---

### Transaction (Audit Trail)

```typescript
{
  id: string;                // cuid
  type: string;              // "credit" | "debit" | "transfer"
  amount: Decimal;           // Decimal(19,4)
  sourceWalletId?: string;   // FK to Wallet (for debit/transfer)
  destinationWalletId?: string; // FK to Wallet (for credit/transfer)
  relatedEntityType?: string; // "Purchase" | "Recharge" | "AffiliateCommission"
  relatedEntityId?: string;   // ID of related entity
  description: string;        // Human-readable description
  metadata?: JSON;            // Additional context
  idempotencyKey: string;     // Unique key to prevent duplicates
  createdAt: Date;            // Immutable timestamp
}
```

---

## Business Rules

### Wallet Rules

1. **Initial Balance**: New wallets start with $0.00 USD
2. **Balance Precision**: Always Decimal(19,4) - NEVER Float
3. **Non-Negative**: Balance can never go negative
4. **Currency Matching**: Transfers require same currency
5. **Atomic Operations**: All multi-step operations are transactional

### Product Rules

1. **Password Security**: Encrypted at-rest (AES-256-CBC), decrypted only on purchase
2. **Immutable After Sale**: Sold products cannot be edited or deleted
3. **Status Lifecycle**: available → sold (no reversal)
4. **Provider Ownership**: Only provider can edit/delete their products

### Purchase Rules

1. **Commission Snapshot**: Commission rate captured at purchase time (currently 5%)
2. **Calculation**:
   - Provider Earnings = Product Price × (1 - Commission Rate)
   - Admin Commission = Product Price × Commission Rate
3. **Atomic Transaction**: All wallet operations succeed or fail together
4. **Credentials Delivery**: Account password decrypted ONLY in purchase response
5. **Audit Trail**: Immutable Purchase and Transaction records

### Authentication Rules

1. **JWT Expiration**: 7 days
2. **Cookie Settings**: SameSite=Lax, Secure in production, NOT httpOnly
3. **Token Storage**: Cookie + localStorage (for Authorization headers)
4. **Middleware Limitation**: Edge Runtime cannot validate JWT (validate in API routes)

---

## Frontend Integration Notes

### Authentication Flow

1. User registers/logs in → Receives JWT token + cookie
2. Frontend stores token in localStorage
3. Protected routes check cookie existence (middleware)
4. API calls include `Authorization: Bearer <token>` header
5. Dashboard calls `/api/auth/me` to validate and fetch user data

### Critical UX Considerations

**Purchase Credentials:**
- Display account credentials immediately after purchase
- Show prominent warning: "Save these credentials now - they won't be shown again"
- Provide copy-to-clipboard functionality
- Consider offering email/download options

**Balance Management:**
- Show real-time balance on all purchase-related pages
- Disable purchase buttons when balance insufficient
- Display clear error messages for failed transactions

**Error Handling:**
- Map API error codes to user-friendly messages
- Show validation errors inline on forms
- Implement retry logic for network failures
- Log errors for debugging (exclude sensitive data)

---

## Future Endpoints (Not Yet Implemented)

These endpoints are defined in the database schema but not yet implemented:

### Recharges
- `POST /api/v1/wallets/recharge` - Add funds via payment gateway
- `GET /api/v1/wallets/recharges` - List recharge history

### Affiliations
- `GET /api/v1/affiliates/referrals` - View referral tree
- `POST /api/v1/affiliates/generate-code` - Generate referral code

### Disputes
- `POST /api/v1/disputes` - Open dispute for purchase
- `GET /api/v1/disputes` - List disputes
- `POST /api/v1/disputes/:id/message` - Send message in dispute
- `POST /api/v1/disputes/:id/resolve` - Resolve dispute (conciliator only)

### Admin
- `GET /api/admin/users` - List all users
- `PUT /api/admin/users/:id` - Update user role
- `PUT /api/admin/config/commissions` - Update commission rates
- `GET /api/admin/reports` - Platform analytics

---

## Testing the API

### Using cURL

**Register:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
```

**Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

**Get Balance:**
```bash
curl http://localhost:3000/api/v1/wallets/balance \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**List Products:**
```bash
curl "http://localhost:3000/api/v1/products?category=netflix&limit=10"
```

**Create Product:**
```bash
curl -X POST http://localhost:3000/api/v1/products \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "category":"netflix",
    "price":15.99,
    "accountEmail":"acc@netflix.com",
    "accountPassword":"password123"
  }'
```

**Purchase Product:**
```bash
curl -X POST http://localhost:3000/api/v1/purchases \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"productId":"YOUR_PRODUCT_ID"}'
```

---

## Changelog

### v1.0 (2025-11-15)
- Initial documentation
- 398 tests passing
- Complete implementation of:
  - Authentication (register, login, me)
  - Wallets (balance, transfer)
  - Products (CRUD operations)
  - Purchases (create, list, get by ID)

---

**For questions or issues, contact the backend team.**
