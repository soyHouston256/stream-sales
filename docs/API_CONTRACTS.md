# API CONTRACTS - MARKETPLACE ACADÉMICO

> **Versión**: v1
> **Base URL**: `/api/v1`
> **Autenticación**: JWT Bearer Token
> **Fecha de diseño**: 2025-11-15

---

## 🔐 AUTENTICACIÓN

### POST `/api/v1/auth/register`

**Descripción**: Registrar nuevo usuario en el sistema.

**Request Body**:
```json
{
  "email": "user@example.com",      // Required, formato email
  "password": "password123",        // Required, min 6 caracteres
  "name": "John Doe",               // Optional
  "referralCode": "ABC123"          // Optional, código de afiliado
}
```

**Response 201 Created**:
```json
{
  "user": {
    "id": "cm1abc123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "createdAt": "2025-11-15T10:00:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "wallet": {
    "id": "wl_abc123",
    "balance": "0.0000",
    "currency": "USD"
  }
}
```

**Errors**:
- `400 Bad Request`: Email inválido o password muy corto
- `409 Conflict`: Email ya registrado
- `422 Unprocessable Entity`: Código de referido inválido

---

### POST `/api/v1/auth/login`

**Descripción**: Iniciar sesión.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response 200 OK**:
```json
{
  "user": {
    "id": "cm1abc123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "seller"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors**:
- `401 Unauthorized`: Credenciales inválidas

---

### GET `/api/v1/auth/me`

**Descripción**: Obtener usuario actual autenticado.

**Headers**:
```
Authorization: Bearer <token>
```

**Response 200 OK**:
```json
{
  "user": {
    "id": "cm1abc123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "seller",
    "createdAt": "2025-11-15T10:00:00Z",
    "updatedAt": "2025-11-15T10:00:00Z"
  },
  "wallet": {
    "id": "wl_abc123",
    "balance": "1500.5000",
    "currency": "USD",
    "status": "active"
  }
}
```

**Errors**:
- `401 Unauthorized`: Token inválido o expirado
- `404 Not Found`: Usuario no encontrado

---

## 💰 WALLET (Billetera)

### GET `/api/v1/wallets/balance`

**Descripción**: Obtener balance actual de la wallet.

**Headers**: `Authorization: Bearer <token>`

**Response 200 OK**:
```json
{
  "wallet": {
    "id": "wl_abc123",
    "balance": "1500.5000",
    "currency": "USD",
    "status": "active",
    "updatedAt": "2025-11-15T10:30:00Z"
  }
}
```

---

### POST `/api/v1/wallets/recharge`

**Descripción**: Iniciar recarga de saldo.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "amount": "100.00",               // Required, Decimal
  "paymentMethod": "credit_card",   // Required: credit_card, paypal, bank_transfer, crypto
  "paymentGateway": "stripe"        // Required: stripe, paypal, etc.
}
```

**Response 201 Created**:
```json
{
  "recharge": {
    "id": "rch_abc123",
    "amount": "100.0000",
    "paymentMethod": "credit_card",
    "status": "pending",
    "createdAt": "2025-11-15T10:00:00Z"
  },
  "paymentUrl": "https://stripe.com/checkout/xyz"  // URL para completar pago
}
```

**Errors**:
- `400 Bad Request`: Amount inválido o payment method no soportado
- `401 Unauthorized`: No autenticado

---

### POST `/api/v1/wallets/confirm-recharge`

**Descripción**: Confirmar recarga (webhook de pasarela de pago).

**Request Body**:
```json
{
  "rechargeId": "rch_abc123",
  "externalTransactionId": "stripe_tx_xyz",
  "status": "completed"            // completed, failed
}
```

**Response 200 OK**:
```json
{
  "recharge": {
    "id": "rch_abc123",
    "status": "completed",
    "completedAt": "2025-11-15T10:05:00Z"
  },
  "transaction": {
    "id": "tx_abc123",
    "type": "credit",
    "amount": "100.0000",
    "description": "Recarga de saldo"
  },
  "newBalance": "1600.5000"
}
```

---

### GET `/api/v1/wallets/transactions`

**Descripción**: Obtener historial de transacciones.

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `page` (int, default: 1)
- `limit` (int, default: 20, max: 100)
- `type` (string, optional): credit, debit, transfer
- `startDate` (ISO date, optional)
- `endDate` (ISO date, optional)

**Response 200 OK**:
```json
{
  "transactions": [
    {
      "id": "tx_abc123",
      "type": "credit",
      "amount": "100.0000",
      "description": "Recarga de saldo",
      "relatedEntityType": "Recharge",
      "relatedEntityId": "rch_abc123",
      "createdAt": "2025-11-15T10:05:00Z"
    },
    {
      "id": "tx_abc124",
      "type": "debit",
      "amount": "50.0000",
      "description": "Compra de producto Netflix Premium",
      "relatedEntityType": "Purchase",
      "relatedEntityId": "pur_xyz789",
      "createdAt": "2025-11-15T11:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

---

### POST `/api/v1/wallets/transfer`

**Descripción**: Transferir dinero P2P (solo para Affiliates).

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "toUserId": "cm1xyz789",          // ID del usuario destino
  "amount": "25.50",
  "description": "Pago por servicio"
}
```

**Response 200 OK**:
```json
{
  "transfer": {
    "id": "tx_abc125",
    "from": {
      "userId": "cm1abc123",
      "walletId": "wl_abc123"
    },
    "to": {
      "userId": "cm1xyz789",
      "walletId": "wl_xyz789"
    },
    "amount": "25.5000",
    "description": "Pago por servicio",
    "createdAt": "2025-11-15T12:00:00Z"
  },
  "newBalance": "1575.0000"
}
```

**Errors**:
- `400 Bad Request`: Amount mayor al balance disponible
- `403 Forbidden`: Usuario no tiene rol de affiliate
- `404 Not Found`: Usuario destino no encontrado

---

## 📦 PRODUCTOS (Provider Module)

### POST `/api/v1/products`

**Descripción**: Crear nuevo producto (solo Provider).

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "category": "netflix",           // netflix, spotify, hbo, disney, prime, youtube, other
  "name": "Cuenta Netflix Premium",
  "description": "Cuenta compartida 4 pantallas",
  "price": "15.99",
  "accountEmail": "netflix@example.com",
  "accountPassword": "password123",  // Se encriptará automáticamente
  "accountDetails": {                // Optional
    "plan": "Premium",
    "screens": 4
  }
}
```

**Response 201 Created**:
```json
{
  "product": {
    "id": "prod_abc123",
    "category": "netflix",
    "name": "Cuenta Netflix Premium",
    "description": "Cuenta compartida 4 pantallas",
    "price": "15.9900",
    "status": "available",
    "createdAt": "2025-11-15T10:00:00Z"
  }
}
```

**Errors**:
- `400 Bad Request`: Datos inválidos
- `403 Forbidden`: Usuario no tiene rol de provider

---

### GET `/api/v1/products`

**Descripción**: Listar productos disponibles (público para Sellers).

**Query Parameters**:
- `page` (int, default: 1)
- `limit` (int, default: 20)
- `category` (string, optional): filtrar por categoría
- `minPrice` (decimal, optional)
- `maxPrice` (decimal, optional)
- `status` (string, default: "available")

**Response 200 OK**:
```json
{
  "products": [
    {
      "id": "prod_abc123",
      "category": "netflix",
      "name": "Cuenta Netflix Premium",
      "description": "Cuenta compartida 4 pantallas",
      "price": "15.9900",
      "provider": {
        "id": "cm1prov123",
        "name": "Provider Name"
      },
      "status": "available",
      "createdAt": "2025-11-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

### GET `/api/v1/products/my-products`

**Descripción**: Listar mis productos (solo Provider).

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**: (igual que GET /products)

**Response 200 OK**:
```json
{
  "products": [
    {
      "id": "prod_abc123",
      "category": "netflix",
      "name": "Cuenta Netflix Premium",
      "price": "15.9900",
      "status": "available",   // available, sold, reserved
      "createdAt": "2025-11-15T10:00:00Z",
      "soldAt": null
    },
    {
      "id": "prod_abc124",
      "category": "spotify",
      "name": "Cuenta Spotify Premium",
      "price": "9.9900",
      "status": "sold",
      "createdAt": "2025-11-14T10:00:00Z",
      "soldAt": "2025-11-15T11:00:00Z"
    }
  ],
  "stats": {
    "total": 25,
    "available": 10,
    "sold": 15,
    "totalEarnings": "1250.5000"
  }
}
```

---

### PUT `/api/v1/products/:id`

**Descripción**: Actualizar producto (solo Provider owner).

**Headers**: `Authorization: Bearer <token>`

**Request Body**: (campos opcionales)
```json
{
  "name": "Cuenta Netflix Premium 4K",
  "description": "Nueva descripción",
  "price": "17.99"
}
```

**Response 200 OK**:
```json
{
  "product": {
    "id": "prod_abc123",
    "name": "Cuenta Netflix Premium 4K",
    "price": "17.9900",
    "updatedAt": "2025-11-15T12:00:00Z"
  }
}
```

**Errors**:
- `403 Forbidden`: No eres el owner del producto
- `400 Bad Request`: No se puede actualizar producto vendido

---

### DELETE `/api/v1/products/:id`

**Descripción**: Eliminar producto (soft delete, solo Provider owner).

**Headers**: `Authorization: Bearer <token>`

**Response 200 OK**:
```json
{
  "message": "Product deleted successfully",
  "productId": "prod_abc123"
}
```

**Errors**:
- `403 Forbidden`: No eres el owner
- `400 Bad Request`: No se puede eliminar producto vendido

---


## 🛒 PURCHASES (Seller Module - Core Business)

### POST `/api/v1/purchases`

**Descripción**: Comprar un producto (solo Seller). **TRANSACCIÓN CRÍTICA**.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "productId": "prod_abc123"
}
```

**Response 201 Created**:
```json
{
  "purchase": {
    "id": "pur_xyz789",
    "productId": "prod_abc123",
    "sellerId": "cm1sell123",
    "providerId": "cm1prov456",
    "amount": "15.9900",
    "adminCommission": "0.8000",
    "providerEarnings": "15.1900",
    "commissionRate": "5.00",
    "status": "completed",
    "createdAt": "2025-11-15T11:00:00Z",
    "completedAt": "2025-11-15T11:00:01Z"
  },
  "product": {
    "id": "prod_abc123",
    "name": "Cuenta Netflix Premium",
    "accountEmail": "netflix@example.com",
    "accountPassword": "decrypted_password_here",
    "accountDetails": {
      "plan": "Premium",
      "screens": 4
    }
  },
  "transactions": [
    {
      "id": "tx_debit123",
      "type": "debit",
      "amount": "15.9900",
      "description": "Compra de Cuenta Netflix Premium"
    }
  ],
  "newBalance": "1484.5100"
}
```

**Errors**:
- `400 Bad Request`: Producto no disponible
- `402 Payment Required`: Saldo insuficiente
- `403 Forbidden`: Usuario no tiene rol de seller
- `404 Not Found`: Producto no encontrado
- `409 Conflict`: Producto ya vendido (race condition)

### GET `/api/v1/purchases/my-purchases`

**Descripción**: Listar mis compras (solo Seller).

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `page` (int, default: 1)
- `limit` (int, default: 20)
- `status` (string, optional): completed, failed, refunded

**Response 200 OK**:
```json
{
  "purchases": [
    {
      "id": "pur_xyz789",
      "product": {
        "id": "prod_abc123",
        "name": "Cuenta Netflix Premium",
        "category": "netflix",
        "accountEmail": "netflix@example.com",
        "accountPassword": "decrypted_password"
      },
      "amount": "15.9900",
      "status": "completed",
      "createdAt": "2025-11-15T11:00:00Z"
    }
  ],
  "stats": {
    "totalPurchases": 12,
    "totalSpent": "450.7500"
  }
}
```

---

## 📊 RESUMEN

**Total endpoints**: 32
**Módulos**: Auth, Wallet, Products, Purchases, Affiliates, Disputes, Admin
**Autenticación**: JWT Bearer Token
**Estados**: ✅ Listo para implementación
