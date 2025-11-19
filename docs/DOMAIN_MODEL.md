# MODELO DE DOMINIO - MARKETPLACE ACADÉMICO

> **Fecha de diseño**: 2025-11-15
> **Arquitecto**: system-architect-affiliate
> **Estado**: En diseño - Fase 1

---

## 1. ENTIDADES DEL DOMINIO

### 1.1 User (Aggregate Root) ✅ YA EXISTE

**Descripción**: Representa a cualquier usuario del sistema. Soporta 5 roles diferentes.

**Atributos**:
- `id: string` (UUID/CUID)
- `email: Email` (Value Object)
- `password: Password` (Value Object)
- `name?: string`
- `role: UserRole` (Value Object - "admin" | "provider" | "seller" | "affiliate" | "conciliator")
- `createdAt: DateTime`
- `updatedAt: DateTime`

**Responsabilidades**:
- Autenticación
- Verificación de credenciales
- Actualización de perfil
- Control de acceso basado en rol

**Relaciones**:
- `has one` Wallet (1-to-1)
- `has many` Products (como Provider)
- `has many` Purchases (como Seller)
- `has many` Affiliations (como Affiliate o Referred)
- `has many` Disputes (como Seller, Provider, o Conciliator)

**Invariantes**:
- Email debe ser único en el sistema
- Password debe estar hasheado (bcrypt)
- Role debe ser uno de los 5 valores permitidos

---

### 1.2 Wallet (Aggregate Root) 🆕 CRÍTICO

**Descripción**: Monedero digital asociado a cada usuario. Maneja el balance y todas las transacciones financieras.

**Atributos**:
- `id: string` (UUID)
- `userId: string` (Foreign Key a User - relación 1-to-1)
- `balance: Decimal` (NUNCA Float - usar Prisma Decimal)
- `currency: string` (Default: "USD")
- `status: WalletStatus` (Value Object - "active" | "frozen" | "closed")
- `createdAt: DateTime`
- `updatedAt: DateTime`

**Responsabilidades**:
- Mantener balance actualizado
- Validar suficiencia de fondos antes de débitos
- Registrar todas las operaciones (via Transaction)
- Garantizar balance nunca negativo

**Relaciones**:
- `belongs to` User (1-to-1)
- `has many` Transactions (como source o destination)
- `has many` Recharges

**Invariantes**:
- `balance >= 0` SIEMPRE (regla de oro)
- Solo puede haber UNA wallet por usuario
- Operaciones de débito/crédito deben ser atómicas

**Métodos de dominio**:
- `credit(amount: Money): void` - Incrementa balance
- `debit(amount: Money): void` - Decrementa balance (valida >= 0)
- `canDebit(amount: Money): boolean` - Verifica si hay fondos suficientes
- `freeze(): void` - Congela wallet
- `activate(): void` - Activa wallet

---

### 1.3 Transaction (Entity dentro del Aggregate de Wallet) 🆕

**Descripción**: Registro inmutable de cada operación financiera. Implementa doble entrada contable.

**Atributos**:
- `id: string` (UUID)
- `type: TransactionType` (Value Object - "credit" | "debit" | "transfer")
- `amount: Decimal`
- `sourceWalletId?: string` (Wallet de origen - nullable para recargas)
- `destinationWalletId?: string` (Wallet destino - nullable para débitos administrativos)
- `relatedEntityType?: string` (ej. "Purchase", "Recharge", "AffiliateCommission")
- `relatedEntityId?: string` (ID de la entidad relacionada)
- `description: string`
- `metadata?: JSON` (datos adicionales)
- `idempotencyKey: string` (para prevenir duplicados)
- `createdAt: DateTime` (timestamp exacto)

**Responsabilidades**:
- Registro inmutable de operaciones
- Trazabilidad completa
- Auditoría financiera

**Relaciones**:
- `belongs to` sourceWallet (Wallet)
- `belongs to` destinationWallet (Wallet)

**Invariantes**:
- Transaction es INMUTABLE una vez creada
- Toda transacción debe tener source O destination (o ambos)
- idempotencyKey debe ser único (previene duplicados)

---

### 1.4 Recharge (Entity) 🆕

**Descripción**: Registro de recargas de saldo realizadas por usuarios (principalmente Sellers).

**Atributos**:
- `id: string` (UUID)
- `walletId: string` (Wallet que recibe la recarga)
- `amount: Decimal`
- `paymentMethod: PaymentMethod` (Value Object - "credit_card" | "paypal" | "bank_transfer" | "crypto")
- `paymentGateway: string` (ej. "stripe", "paypal")
- `externalTransactionId?: string` (ID de la pasarela de pago)
- `status: RechargeStatus` (Value Object - "pending" | "completed" | "failed" | "cancelled")
- `metadata?: JSON` (datos del pago)
- `createdAt: DateTime`
- `completedAt?: DateTime`

**Responsabilidades**:
- Tracking de recargas
- Integración con pasarelas de pago
- Reconciliación de pagos

**Relaciones**:
- `belongs to` Wallet
- `has one` Transaction (cuando status = "completed")

**Invariantes**:
- Solo recargas con status="completed" generan Transaction
- externalTransactionId debe ser único si está presente

---

### 1.5 Product (Aggregate Root) 🆕

**Descripción**: Representa una cuenta de streaming (Netflix, Spotify, etc.) que un Provider pone a la venta.

**Atributos**:
- `id: string` (UUID)
- `providerId: string` (Foreign Key a User con role="provider")
- `category: ProductCategory` (Value Object - "netflix" | "spotify" | "hbo" | "disney" | "prime" | "other")
- `name: string` (ej. "Cuenta Netflix Premium")
- `description: string`
- `price: Decimal`
- `accountEmail: string` (email de la cuenta de streaming)
- `accountPassword: string` (password de la cuenta - ENCRIPTADO)
- `accountDetails?: JSON` (datos adicionales como perfil, plan, etc.)
- `status: ProductStatus` (Value Object - "available" | "sold" | "reserved")
- `createdAt: DateTime`
- `updatedAt: DateTime`
- `soldAt?: DateTime`

**Responsabilidades**:
- Gestión de inventario
- Validación de disponibilidad
- Protección de credenciales de la cuenta
- Tracking de estado del producto

**Relaciones**:
- `belongs to` User (Provider)
- `has one` Purchase (cuando es vendido)

**Invariantes**:
- Un Product solo puede venderse UNA vez
- status="sold" debe coincidir con la existencia de un Purchase
- accountPassword DEBE estar encriptado en la BD
- price > 0

**Métodos de dominio**:
- `markAsSold(): void` - Cambia status a "sold"
- `markAsReserved(): void` - Cambia status a "reserved" (temporal durante compra)
- `isAvailable(): boolean` - Verifica si está disponible para compra

---

### 1.6 Purchase (Aggregate Root) 🆕 CRÍTICO

**Descripción**: Representa la compra de un Product por parte de un Seller. Es el core del negocio.

**Atributos**:
- `id: string` (UUID)
- `sellerId: string` (Foreign Key a User con role="seller")
- `productId: string` (Foreign Key a Product)
- `providerId: string` (Foreign Key a User con role="provider" - denormalizado para queries)
- `amount: Decimal` (precio pagado)
- `providerEarnings: Decimal` (cantidad que recibió el provider = amount - commission)
- `adminCommission: Decimal` (comisión cobrada por la plataforma)
- `commissionRate: Decimal` (% de comisión aplicado - snapshot del momento)
- `status: PurchaseStatus` (Value Object - "pending" | "completed" | "failed" | "refunded")
- `transactionIds: string[]` (IDs de las Transactions generadas)
- `createdAt: DateTime`
- `completedAt?: DateTime`
- `refundedAt?: DateTime`

**Responsabilidades**:
- Orquestar el flujo de compra
- Registrar la transacción comercial
- Mantener snapshot de comisiones (para auditoría)
- Vincular Seller + Product + Transacciones

**Relaciones**:
- `belongs to` Seller (User)
- `belongs to` Product
- `belongs to` Provider (User)
- `has many` Transactions (débito seller, crédito provider, crédito admin)
- `has one` Dispute (opcional)

**Invariantes**:
- amount = providerEarnings + adminCommission (siempre)
- status="completed" implica que existen las Transactions correspondientes
- Un Purchase solo puede tener UN Product
- Purchase es inmutable una vez completado (solo puede refundarse)

**Métodos de dominio**:
- `complete(): void` - Marca como completado
- `fail(reason: string): void` - Marca como fallido
- `refund(): void` - Procesa reembolso

---

### 1.7 CommissionConfig (Entity) 🆕

**Descripción**: Configuración global de comisiones de la plataforma. Gestionada por Administradores.

**Atributos**:
- `id: string` (UUID)
- `type: CommissionType` (Value Object - "sale" | "registration")
- `rate: Decimal` (porcentaje 0-100, ej. 5.5 = 5.5%)
- `isActive: boolean`
- `createdAt: DateTime`
- `updatedAt: DateTime`
- `effectiveFrom: DateTime` (desde cuándo aplica)

**Responsabilidades**:
- Almacenar tasas de comisión configurables
- Permitir histórico de cambios
- Validar rangos de porcentaje

**Relaciones**:
- Standalone (no tiene relaciones directas, se consulta al calcular comisiones)

**Invariantes**:
- rate debe estar entre 0 y 100
- Solo puede haber UNA configuración activa por tipo a la vez
- Cambios deben crear nuevo registro (para mantener historial)

---

### 1.8 Affiliation (Entity) 🆕

**Descripción**: Representa la relación de referido entre un Affiliate y un nuevo usuario.

**Atributos**:
- `id: string` (UUID)
- `affiliateId: string` (Foreign Key a User con role="affiliate" - quien refiere)
- `referredUserId: string` (Foreign Key a User - el usuario referido)
- `referralCode: string` (código único usado en el registro)
- `status: AffiliationStatus` (Value Object - "active" | "inactive" | "suspended")
- `commissionPaid: boolean` (si ya se cobró la comisión de registro)
- `commissionAmount?: Decimal` (monto de comisión cobrado - snapshot)
- `createdAt: DateTime` (cuando el referido se registró)

**Responsabilidades**:
- Tracking de árbol de referidos
- Validación de códigos de referido
- Control de comisiones pagadas

**Relaciones**:
- `belongs to` Affiliate (User)
- `belongs to` ReferredUser (User)
- `has one` Transaction (comisión cobrada)

**Invariantes**:
- Un usuario solo puede ser referido por UN affiliate
- referralCode debe ser único por affiliate
- commissionPaid=true implica que existe una Transaction

---

### 1.9 Dispute (Aggregate Root) 🆕

**Descripción**: Representa una disputa abierta por un Seller o Provider sobre una compra.

**Atributos**:
- `id: string` (UUID)
- `purchaseId: string` (Foreign Key a Purchase - la compra en disputa)
- `sellerId: string` (Foreign Key a User - denormalizado)
- `providerId: string` (Foreign Key a User - denormalizado)
- `conciliatorId?: string` (Foreign Key a User con role="conciliator" - quien la atiende)
- `openedBy: string` ("seller" | "provider")
- `reason: string` (motivo de la disputa)
- `status: DisputeStatus` (Value Object - "open" | "under_review" | "resolved" | "closed")
- `resolution?: string` (descripción de la resolución)
- `resolutionType?: ResolutionType` (Value Object - "refund_seller" | "favor_provider" | "partial_refund" | "no_action")
- `createdAt: DateTime`
- `assignedAt?: DateTime` (cuando se asigna a un conciliador)
- `resolvedAt?: DateTime`

**Responsabilidades**:
- Gestión del ciclo de vida de disputas
- Tracking de resoluciones
- Vinculación con Purchase

**Relaciones**:
- `belongs to` Purchase
- `belongs to` Seller (User)
- `belongs to` Provider (User)
- `belongs to` Conciliator (User) - opcional
- `has many` DisputeMessages

**Invariantes**:
- Solo puede haber UNA disputa abierta por Purchase
- status="resolved" requiere resolution y resolutionType
- resolutionType="refund_*" debe generar Transacciones de reembolso

---

### 1.10 DisputeMessage (Entity) 🆕

**Descripción**: Mensajes dentro del hilo de una disputa.

**Atributos**:
- `id: string` (UUID)
- `disputeId: string` (Foreign Key a Dispute)
- `senderId: string` (Foreign Key a User - puede ser seller, provider o conciliator)
- `message: string`
- `attachments?: JSON` (URLs de archivos adjuntos si hay)
- `isInternal: boolean` (si es nota interna del conciliator)
- `createdAt: DateTime`

**Responsabilidades**:
- Comunicación entre partes
- Registro de evidencias
- Notas internas de conciliación

**Relaciones**:
- `belongs to` Dispute
- `belongs to` Sender (User)

**Invariantes**:
- message no puede estar vacío
- isInternal=true solo si sender es conciliator

---

## 2. VALUE OBJECTS

### 2.1 Money 🆕

**Descripción**: Representa un monto monetario con su moneda.

**Atributos**:
- `amount: Decimal` (NUNCA Float)
- `currency: string` (ISO code, default "USD")

**Validaciones**:
- amount >= 0 (excepto para representar débitos)
- currency debe ser un código válido

**Métodos**:
- `add(other: Money): Money`
- `subtract(other: Money): Money`
- `multiply(factor: number): Money`
- `equals(other: Money): boolean`

---

### 2.2 UserRole 🆕

**Descripción**: Roles válidos en el sistema.

**Valores**:
- `admin` - Administrador del sistema
- `provider` - Proveedor de cuentas
- `seller` - Comprador/vendedor de cuentas
- `affiliate` - Afiliador que refiere usuarios
- `conciliator` - Resuelve disputas

**Validaciones**:
- Debe ser uno de los 5 valores exactos

---

### 2.3 WalletStatus

**Valores**:
- `active` - Wallet operativa
- `frozen` - Congelada (no permite débitos ni créditos)
- `closed` - Cerrada permanentemente

---

### 2.4 ProductCategory

**Valores**:
- `netflix`
- `spotify`
- `hbo`
- `disney`
- `prime`
- `youtube`
- `other`

---

### 2.5 ProductStatus

**Valores**:
- `available` - Disponible para venta
- `reserved` - Reservado temporalmente (durante proceso de compra)
- `sold` - Vendido

---

### 2.6 TransactionType

**Valores**:
- `credit` - Incremento de balance
- `debit` - Decremento de balance
- `transfer` - Transferencia P2P

---

### 2.7 PurchaseStatus

**Valores**:
- `pending` - Compra iniciada pero no completada
- `completed` - Compra exitosa
- `failed` - Compra fallida
- `refunded` - Compra reembolsada

---

### 2.8 DisputeStatus

**Valores**:
- `open` - Disputa creada, esperando asignación
- `under_review` - Asignada a conciliator, en revisión
- `resolved` - Resuelta con decisión
- `closed` - Cerrada (archivada)

---

### 2.9 ResolutionType

**Valores**:
- `refund_seller` - Reembolso completo al vendedor
- `favor_provider` - Decisión a favor del proveedor
- `partial_refund` - Reembolso parcial
- `no_action` - Sin acción correctiva

---

### 2.10 PaymentMethod

**Valores**:
- `credit_card`
- `paypal`
- `bank_transfer`
- `crypto`
- `mock` (para desarrollo)

---

### 2.11 RechargeStatus

**Valores**:
- `pending` - Pago en proceso
- `completed` - Pago exitoso
- `failed` - Pago fallido
- `cancelled` - Cancelado por el usuario

---

## 3. AGREGADOS (Aggregate Boundaries)

### Aggregate 1: User + Wallet

**Root**: User

**Entities incluidas**:
- User (root)
- Wallet (parte del aggregate)

**Razón**: Wallet es parte esencial de User. Siempre se accede a Wallet a través de User. La creación de User automáticamente crea Wallet.

**Boundary**: User controla todo el ciclo de vida de Wallet.

---

### Aggregate 2: Product

**Root**: Product

**Entities incluidas**:
- Product (único en el aggregate)

**Razón**: Product es una entidad independiente que puede existir sin otras entidades. Su ciclo de vida es controlado por el Provider (User).

**Boundary**: Product se gestiona independientemente.

---

### Aggregate 3: Purchase

**Root**: Purchase

**Entities incluidas**:
- Purchase (único en el aggregate)

**Razón**: Purchase es la transacción central del negocio. Referencias a User, Product, Wallet, pero no los contiene.

**Boundary**: Purchase orquesta pero no posee otras entidades.

---

### Aggregate 4: Dispute + DisputeMessages

**Root**: Dispute

**Entities incluidas**:
- Dispute (root)
- DisputeMessage (entities)

**Razón**: DisputeMessages solo existen en el contexto de una Dispute. No tienen sentido sin su Dispute padre.

**Boundary**: Dispute controla el ciclo de vida de todos sus mensajes.

---

### Aggregate 5: Transaction

**Root**: Transaction

**Entities incluidas**:
- Transaction (único, entity inmutable)

**Razón**: Transaction es inmutable y se crea como parte de operaciones en Wallet, pero se persiste independientemente para auditoría.

**Boundary**: Transaction es append-only, nunca se modifica.

---

## 4. MAPA DE RELACIONES

| From Entity | Relationship | To Entity | Type | Cardinality | Notes |
|-------------|-------------|-----------|------|-------------|-------|
| User | has one | Wallet | Composition | 1:1 | Wallet se crea automáticamente con User |
| User (Provider) | has many | Products | Association | 1:N | Provider puede tener múltiples productos |
| User (Seller) | has many | Purchases | Association | 1:N | Seller puede tener múltiples compras |
| User (Affiliate) | has many | Affiliations | Association | 1:N | Como afiliador |
| User (Referred) | has one | Affiliation | Association | 1:1 | Como referido (máximo 1) |
| Wallet | has many | Transactions (source) | Association | 1:N | Transacciones de salida |
| Wallet | has many | Transactions (dest) | Association | 1:N | Transacciones de entrada |
| Wallet | has many | Recharges | Association | 1:N | Historial de recargas |
| Product | belongs to | User (Provider) | Association | N:1 | Cada producto tiene un proveedor |
| Product | has one | Purchase | Association | 1:1 | Cuando se vende |
| Purchase | belongs to | User (Seller) | Association | N:1 | Comprador |
| Purchase | belongs to | User (Provider) | Association | N:1 | Vendedor (denormalizado) |
| Purchase | belongs to | Product | Association | N:1 | Producto comprado |
| Purchase | references | Transactions | Association | 1:N | Transacciones generadas (2-3) |
| Purchase | has one | Dispute | Association | 1:1 | Opcional |
| Affiliation | belongs to | User (Affiliate) | Association | N:1 | Quien refiere |
| Affiliation | belongs to | User (Referred) | Association | N:1 | Quien es referido |
| Affiliation | has one | Transaction | Association | 1:1 | Comisión cobrada |
| Dispute | belongs to | Purchase | Association | N:1 | Compra en disputa |
| Dispute | has many | DisputeMessages | Composition | 1:N | Mensajes del hilo |
| DisputeMessage | belongs to | Dispute | Association | N:1 | Disputa padre |
| DisputeMessage | belongs to | User (Sender) | Association | N:1 | Remitente |
| Recharge | belongs to | Wallet | Association | N:1 | Wallet recargada |
| Recharge | has one | Transaction | Association | 1:1 | Cuando se completa |
| Transaction | references | Wallet (source) | Association | N:1 | Origen (opcional) |
| Transaction | references | Wallet (dest) | Association | N:1 | Destino (opcional) |

---

## 5. EVENTOS DE DOMINIO

### Eventos de Usuario
- `UserRegistered` - Cuando un usuario se registra
  - Data: userId, email, role, referralCode?
  - Triggers: Crear Wallet, Cobrar comisión de afiliación (si hay)

- `UserRoleChanged` - Cuando cambia el rol de un usuario
  - Data: userId, oldRole, newRole
  - Triggers: Validaciones de permisos

### Eventos de Wallet
- `WalletCreated` - Cuando se crea una wallet
  - Data: walletId, userId, initialBalance (0)

- `WalletCredited` - Cuando se acredita dinero
  - Data: walletId, amount, transactionId, reason

- `WalletDebited` - Cuando se debita dinero
  - Data: walletId, amount, transactionId, reason

- `WalletFrozen` - Cuando se congela una wallet
  - Data: walletId, reason

- `BalanceInsufficient` - Cuando se intenta debitar sin fondos
  - Data: walletId, requestedAmount, currentBalance

### Eventos de Productos
- `ProductCreated` - Cuando un provider lista un producto
  - Data: productId, providerId, category, price

- `ProductUpdated` - Cuando se actualiza un producto
  - Data: productId, changes

- `ProductMarkedAsSold` - Cuando se vende un producto
  - Data: productId, purchaseId

### Eventos de Compras (CRÍTICOS)
- `PurchaseInitiated` - Cuando inicia una compra
  - Data: purchaseId, sellerId, productId, amount
  - Triggers: Reservar producto

- `PurchaseCompleted` - Cuando se completa exitosamente
  - Data: purchaseId, sellerId, providerId, amount, commission
  - Triggers: Marcar producto como vendido, Generar transacciones

- `PurchaseFailed` - Cuando falla una compra
  - Data: purchaseId, reason
  - Triggers: Liberar producto reservado

- `PurchaseRefunded` - Cuando se reembolsa
  - Data: purchaseId, amount
  - Triggers: Generar transacciones inversas

### Eventos de Afiliación
- `AffiliationCreated` - Cuando un usuario se registra con referido
  - Data: affiliationId, affiliateId, referredUserId
  - Triggers: Cobrar comisión de registro

- `AffiliateCommissionCharged` - Cuando se cobra comisión
  - Data: affiliationId, amount, transactionId

### Eventos de Disputas
- `DisputeOpened` - Cuando se abre una disputa
  - Data: disputeId, purchaseId, openedBy, reason
  - Triggers: Notificar a partes involucradas

- `DisputeAssigned` - Cuando se asigna a un conciliador
  - Data: disputeId, conciliatorId

- `DisputeMessageSent` - Cuando se envía un mensaje
  - Data: disputeId, messageId, senderId

- `DisputeResolved` - Cuando se resuelve
  - Data: disputeId, resolutionType, resolution
  - Triggers: Generar reembolsos si aplica

### Eventos de Recargas
- `RechargeInitiated` - Cuando se inicia una recarga
  - Data: rechargeId, walletId, amount, paymentMethod

- `RechargeCompleted` - Cuando se confirma el pago
  - Data: rechargeId, transactionId
  - Triggers: Acreditar balance

- `RechargeFailed` - Cuando falla el pago
  - Data: rechargeId, reason

---

## 6. REGLAS DE NEGOCIO CRÍTICAS

### Reglas Financieras (ALTA PRIORIDAD)

1. **Balance no negativo**
   - `Wallet.balance >= 0` SIEMPRE
   - Validar ANTES de cada débito
   - Implementar con constraint en BD

2. **Atomicidad de transacciones**
   - Purchase debe ejecutarse en una transacción de BD
   - Si falla cualquier paso, rollback completo
   - Implementar con Prisma.$transaction()

3. **Doble entrada contable**
   - Cada débito debe tener un crédito correspondiente
   - Suma de todas las transacciones = 0 (sistema cerrado)
   - AdminWallet para balancear comisiones

4. **Uso de Decimal**
   - NUNCA usar Float para dinero
   - Prisma Decimal type en todos los montos
   - JavaScript: usar decimal.js o similar

5. **Idempotencia**
   - Transaction.idempotencyKey previene duplicados
   - Recharge.externalTransactionId previene recargas duplicadas
   - Purchase debe validar que Product no esté vendido

### Reglas de Productos

6. **Venta única**
   - Un Product solo puede venderse UNA vez
   - Validar Product.status === "available" antes de compra
   - Marcar como "reserved" durante transacción

7. **Encriptación de credenciales**
   - Product.accountPassword debe estar encriptado
   - Solo desencriptar al mostrar a Seller después de compra
   - Nunca exponer en logs o errores

### Reglas de Comisiones

8. **Snapshot de comisiones**
   - Purchase.commissionRate guarda el % del momento
   - Cambios en CommissionConfig no afectan compras pasadas
   - Permite auditoría histórica

9. **Validación de comisiones**
   - CommissionConfig.rate entre 0 y 100
   - Solo una configuración activa por tipo
   - effectiveFrom permite programar cambios

10. **Cálculo de comisiones**
    - `adminCommission = amount * (commissionRate / 100)`
    - `providerEarnings = amount - adminCommission`
    - Validar: `amount = providerEarnings + adminCommission`

### Reglas de Afiliación

11. **Referido único**
    - Un usuario solo puede ser referido por UN affiliate
    - Validar que User.id no exista en Affiliation.referredUserId

12. **Comisión de registro única**
    - Affiliation.commissionPaid previene cobros duplicados
    - Solo cobrar cuando commissionPaid === false

### Reglas de Disputas

13. **Disputa única por compra**
    - Solo una disputa abierta/under_review por Purchase
    - Validar antes de crear nueva Dispute

14. **Resolución requiere tipo**
    - Dispute con status="resolved" DEBE tener resolutionType
    - resolutionType determina acciones (reembolsos, etc.)

15. **Reembolsos generan transacciones**
    - resolutionType="refund_*" debe crear Transactions
    - Revertir flujo original de dinero

### Reglas de Seguridad

16. **Autorización por rol**
    - Validar User.role en cada operación
    - Provider solo puede gestionar sus Products
    - Seller solo puede ver sus Purchases
    - Admin tiene acceso completo

17. **Soft deletes**
    - Nunca eliminar Purchase, Transaction, Dispute
    - Usar campos deletedAt para registros financieros
    - Permite auditoría completa

18. **Audit trail**
    - Transaction es inmutable (append-only)
    - Cada operación financiera debe generar Transaction
    - metadata guarda contexto adicional

---

## 7. DIAGRAMAS

### 7.1 Entity Relationship Diagram (ERD)

```
┌─────────────┐
│    User     │◄──────────┐
│ (Root)      │           │
├─────────────┤           │1
│ id          │           │
│ email       │     ┌─────┴──────┐
│ password    │     │   Wallet   │
│ name        │     │            │
│ role        │     ├────────────┤
│             │     │ id         │
└──┬──────────┘     │ userId     │
   │                │ balance    │
   │1               │ status     │
   │                └─────┬──────┘
   │                      │1
   │                      │
   │                      │N
   │                ┌─────┴────────┐
   │                │ Transaction  │
   │                ├──────────────┤
   │                │ id           │
   │                │ type         │
   │N               │ amount       │
   ├────────────────┤ sourceWallet │
   │                │ destWallet   │
   │                └──────────────┘
   │
   │         ┌──────────────┐
   │         │   Product    │
   │N        ├──────────────┤
   ├─────────┤ id           │
   │         │ providerId   │
   │         │ category     │
   │         │ name         │
   │         │ price        │
   │         │ status       │
   │         └──────┬───────┘
   │                │1
   │                │
   │                │1
   │         ┌──────┴───────┐
   │         │   Purchase   │
   │N        ├──────────────┤
   ├─────────┤ id           │
   │         │ sellerId     │
   │         │ productId    │
   │         │ amount       │
   │         │ commission   │
   │         │ status       │
   │         └──────┬───────┘
   │                │1
   │                │
   │                │1
   │         ┌──────┴───────┐
   │         │   Dispute    │
   │         │ (Root)       │
   │         ├──────────────┤
   │N        │ id           │
   ├─────────┤ purchaseId   │
   │         │ status       │
   │         │ resolution   │
   │         └──────┬───────┘
   │                │1
   │                │
   │                │N
   │         ┌──────┴─────────┐
   │         │ DisputeMessage │
   │         ├────────────────┤
   │N        │ id             │
   ├─────────┤ disputeId      │
   │         │ senderId       │
   │         │ message        │
   │         └────────────────┘
   │
   │         ┌──────────────┐
   │N        │ Affiliation  │
   ├─────────┤──────────────┤
   │         │ id           │
   │         │ affiliateId  │
   │         │ referredUser │
   │         │ commission   │
   │         └──────────────┘
   │
   │         ┌──────────────┐
   │N        │CommissionCfg │
   │         ├──────────────┤
   │         │ id           │
   │         │ type         │
   │         │ rate         │
   │         │ isActive     │
   │         └──────────────┘
   │
   │         ┌──────────────┐
   │N        │   Recharge   │
   ├─────────┤──────────────┤
            │ id           │
            │ walletId     │
            │ amount       │
            │ status       │
            └──────────────┘
```

### 7.2 Aggregate Boundaries

```
┌─ USER AGGREGATE ──────────────────┐
│                                   │
│  ┌──────────┐                     │
│  │   User   │  (Root)              │
│  │  (Root)  │                     │
│  └────┬─────┘                     │
│       │owns                       │
│       ↓                           │
│  ┌──────────┐                     │
│  │  Wallet  │                     │
│  └──────────┘                     │
│                                   │
└───────────────────────────────────┘

┌─ PRODUCT AGGREGATE ───────────────┐
│                                   │
│  ┌──────────┐                     │
│  │ Product  │  (Root)              │
│  │  (Root)  │                     │
│  └──────────┘                     │
│                                   │
└───────────────────────────────────┘

┌─ PURCHASE AGGREGATE ──────────────┐
│                                   │
│  ┌──────────┐                     │
│  │ Purchase │  (Root)              │
│  │  (Root)  │                     │
│  └──────────┘                     │
│                                   │
└───────────────────────────────────┘

┌─ DISPUTE AGGREGATE ───────────────┐
│                                   │
│  ┌──────────┐                     │
│  │ Dispute  │  (Root)              │
│  │  (Root)  │                     │
│  └────┬─────┘                     │
│       │owns                       │
│       ↓                           │
│  ┌────────────────┐               │
│  │DisputeMessage  │               │
│  │   (Entity)     │               │
│  └────────────────┘               │
│                                   │
└───────────────────────────────────┘

┌─ TRANSACTION (Immutable) ─────────┐
│                                   │
│  ┌──────────────┐                 │
│  │ Transaction  │  (Entity)       │
│  │  (Append-    │                 │
│  │   Only)      │                 │
│  └──────────────┘                 │
│                                   │
└───────────────────────────────────┘
```

### 7.3 Purchase Flow (Sequence Diagram)

```
Seller          PurchaseUseCase      Product      Wallet (Seller)   Wallet (Provider)   Wallet (Admin)
  │                    │                │                 │                  │                 │
  │──Buy Product──────>│                │                 │                  │                 │
  │                    │                │                 │                  │                 │
  │                    │─Check Available>│                 │                  │                 │
  │                    │<─Available─────┤                 │                  │                 │
  │                    │                │                 │                  │                 │
  │                    │─Reserve────────>│                 │                  │                 │
  │                    │                │                 │                  │                 │
  │                    │─Check Balance────────────────────>│                  │                 │
  │                    │<─Sufficient────────────────────────┤                  │                 │
  │                    │                │                 │                  │                 │
  │                    │─Debit Amount────────────────────>│                  │                 │
  │                    │                │                 │                  │                 │
  │                    │─Calculate Commission─────────────────────────────────>│                 │
  │                    │                │                 │                  │                 │
  │                    │─Credit Provider────────────────────────────────────>│                 │
  │                    │                │                 │                  │                 │
  │                    │─Credit Admin─────────────────────────────────────────────────────────>│
  │                    │                │                 │                  │                 │
  │                    │─Mark as Sold───>│                 │                  │                 │
  │                    │                │                 │                  │                 │
  │<─Purchase Complete─┤                │                 │                  │                 │
```

---

## 8. RESUMEN DE ENTIDADES POR ÉPICA

| Épica | Entidades | Value Objects | Aggregate Roots |
|-------|-----------|---------------|-----------------|
| **ÉPICA 1: Core & Admin** | User, CommissionConfig | UserRole | User |
| **ÉPICA 2: Wallet** | Wallet, Transaction, Recharge | Money, WalletStatus, TransactionType, PaymentMethod, RechargeStatus | Wallet, Transaction |
| **ÉPICA 3: Providers** | Product | ProductCategory, ProductStatus | Product |
| **ÉPICA 4: Sellers** | Purchase | PurchaseStatus | Purchase |
| **ÉPICA 5: Affiliation** | Affiliation | - | - |
| **ÉPICA 6: Conciliation** | Dispute, DisputeMessage | DisputeStatus, ResolutionType | Dispute |

**Total**:
- **10 Entidades**
- **11 Value Objects**
- **5 Aggregate Roots**

---

## 9. PRÓXIMOS PASOS

Este modelo de dominio completo debe servir como blueprint para:

1. **fintech-database-architect** → Traducir a schema de Prisma
2. **backend-api-architect** → Diseñar casos de uso y API endpoints
3. **frontend-dashboard-builder** → Entender qué datos mostrar en cada dashboard
4. **qa-automation-engineer** → Identificar casos de test críticos

### Prioridad de Implementación (según roadmap)

**Week 1-2: CRÍTICO**
- Wallet (Aggregate)
- Transaction (Entity)
- Money (Value Object)

**Week 3-5: CORE**
- Product (Aggregate)
- Purchase (Aggregate)
- CommissionConfig (Entity)

**Week 6: AVANZADO**
- Affiliation (Entity)

**Week 7: RESOLUCIÓN**
- Dispute (Aggregate)
- DisputeMessage (Entity)

---

**Diseño completado**: 2025-11-15
**Estado**: ✅ Listo para revisión y aprobación
**Siguiente paso**: fintech-database-architect → Prisma Schema Design

