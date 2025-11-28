# Workflow de Aprobación de Referidos - Documentación

## Resumen

Este documento describe la implementación del nuevo flujo de aprobación de referidos con cobro de monto fijo al afiliado.

## Cambios Implementados

### 1. Base de Datos

#### Schema Prisma

**Tabla `affiliations` (modificada):**
- `approvalStatus` (String, default: 'pending'): Estado de aprobación ('pending' | 'approved' | 'rejected')
- `approvalFee` (Decimal, nullable): Monto fijo cobrado al aprobar
- `approvedAt` (DateTime, nullable): Timestamp de aprobación
- `rejectedAt` (DateTime, nullable): Timestamp de rechazo
- `approvalTransactionId` (String, nullable): ID de la transacción del fee
- Índice agregado: `approvalStatus`

**Nueva tabla `referral_approval_configs`:**
- `id` (String, PK): Identificador único
- `approvalFee` (Decimal): Monto fijo a cobrar (ej: $10.00 USD)
- `isActive` (Boolean): Solo debe haber 1 configuración activa
- `effectiveFrom` (DateTime): Fecha desde que es efectiva
- `createdAt`, `updatedAt`: Timestamps de auditoría
- Índice: `isActive`

#### Migración

Ubicación: `/prisma/migrations/20251128025313_add_referral_approval_workflow/migration.sql`

Aplicada exitosamente con: `npx prisma migrate deploy`

#### Seed

Script: `/prisma/seed-referral-config.ts`

Inserta configuración inicial con fee de $10.00 USD.

Ejecutar con: `npx tsx prisma/seed-referral-config.ts`

---

### 2. Backend (Casos de Uso y APIs)

#### Casos de Uso

**`ApproveReferralUseCase` (`/src/application/use-cases/ApproveReferralUseCase.ts`):**

Flujo de aprobación con transacción atómica:
1. Validar que el afiliado es el dueño del referral
2. Validar que el referral está en estado 'pending'
3. Obtener configuración activa de approval fee
4. Validar saldo suficiente en wallet del afiliado
5. Buscar wallet del admin
6. Ejecutar transacción atómica (Prisma $transaction):
   - Debitar approval fee de wallet del afiliado
   - Acreditar approval fee a wallet del admin
   - Crear registro de Transaction para audit trail
   - Actualizar affiliation con approvalStatus = 'approved'

**`RejectReferralUseCase` (`/src/application/use-cases/RejectReferralUseCase.ts`):**

Flujo de rechazo (sin transacción financiera):
1. Validar ownership del afiliado
2. Validar estado 'pending'
3. Actualizar affiliation con approvalStatus = 'rejected'

#### APIs

**POST `/api/affiliate/referrals/[id]/approve`**
- Autentica al afiliado
- Ejecuta ApproveReferralUseCase
- Retorna detalles de la transacción y balances actualizados
- Códigos de error: 401, 403, 404, 400, 500

**POST `/api/affiliate/referrals/[id]/reject`**
- Autentica al afiliado
- Ejecuta RejectReferralUseCase
- Retorna affiliation actualizada
- Códigos de error: 401, 403, 404, 400, 500

**GET `/api/affiliate/referrals`** (modificado)
- Agregado query param: `approvalStatus` ('pending' | 'approved' | 'rejected')
- Respuesta incluye campos de approval en cada referral

**GET `/api/admin/settings/referral-fee`**
- Obtiene la configuración activa de approval fee
- Solo accesible por admin

**POST `/api/admin/settings/referral-fee`**
- Actualiza el approval fee (desactiva configs previas y crea una nueva activa)
- Body: `{ "approvalFee": 10.00 }`
- Solo accesible por admin

---

### 3. Frontend

#### Tipos TypeScript

**`/src/types/affiliate.ts` (actualizado):**

```typescript
export interface Referral {
  // ... campos existentes
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvalFee?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
}

export interface ReferralFilters {
  // ... campos existentes
  approvalStatus?: 'pending' | 'approved' | 'rejected';
}

export interface ReferralApprovalConfig {
  id: string;
  approvalFee: string;
  isActive: boolean;
  effectiveFrom: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApproveReferralResponse { /* ... */ }
export interface RejectReferralResponse { /* ... */ }
```

#### Componentes

**`ReferralApprovalStatusBadge`** (`/src/components/affiliate/ReferralApprovalStatusBadge.tsx`)
- Badge visual para mostrar el estado de aprobación
- Variantes: pending (amarillo), approved (verde), rejected (rojo)
- Con íconos: Clock, CheckCircle, XCircle

**`ReferralApprovalDialog`** (`/src/components/affiliate/ReferralApprovalDialog.tsx`)
- Dialog para aprobar/rechazar referidos
- Muestra información del referido
- En modo "approve":
  - Muestra monto a cobrar
  - Muestra saldo actual y saldo después
  - Valida saldo insuficiente
  - Muestra alerta si no hay fondos
- En modo "reject":
  - Confirmación sin cargo
- Maneja loading states y errores
- Invalida queries de React Query al completar

#### Páginas

**`/src/app/dashboard/affiliate/referrals-pending/page.tsx`**
- Dashboard exclusivo para referidos pendientes
- Stats cards: Referidos pendientes, Costo por aprobación, Saldo disponible
- Tabla con botones de aprobar/rechazar
- Integra ReferralApprovalDialog
- Fetch de configuración de approval fee
- Fetch de balance del wallet

**`/src/app/dashboard/admin/settings/page.tsx`**
- Panel de administración para configurar el approval fee
- Form para actualizar el monto
- Validaciones: >= 0, <= 1000
- Muestra configuración actual y última actualización
- Alertas informativas sobre el impacto del cambio

#### Navegación

**Agregado en `/src/components/layout/navigation/AffiliateNav.tsx`:**
- Nuevo item: "Referidos Pendientes" con ícono Clock

**Agregado en `/src/components/layout/navigation/AdminNav.tsx`:**
- Nuevo item: "Configuración" con ícono Cog

---

## Flujo Completo del Usuario

### Afiliado

1. **Vendedor se registra con código de referido del afiliado**
   - Se crea un registro en `affiliations` con `approvalStatus: 'pending'`

2. **Afiliado navega a "Referidos Pendientes"**
   - Ve lista de vendedores esperando aprobación
   - Ve el monto que se le cobrará por aprobar
   - Ve su saldo disponible

3. **Afiliado aprueba un referido:**
   - Click en "Aprobar"
   - Dialog muestra detalles del cobro
   - Si tiene saldo suficiente, puede confirmar
   - Sistema ejecuta transacción atómica:
     - Descuenta $10 (o monto configurado) de su wallet
     - Acredita al wallet del admin
     - Crea registro de transacción
     - Actualiza affiliation a 'approved'
   - Toast de confirmación

4. **Afiliado rechaza un referido:**
   - Click en "Rechazar"
   - Dialog de confirmación (sin cargo)
   - Sistema actualiza affiliation a 'rejected'
   - Toast de confirmación

### Administrador

1. **Configura el monto fijo de aprobación**
   - Navega a "Configuración"
   - Ingresa nuevo monto (ej: $15.00)
   - Confirma cambio
   - Sistema desactiva configs anteriores y crea nueva activa

2. **Recibe fees de aprobación en su wallet**
   - Cada aprobación genera una transacción tipo "transfer"
   - Wallet del admin se incrementa automáticamente
   - Transacciones registradas en tabla `transactions` para auditoría

---

## Validaciones Implementadas

### Backend

- El afiliado debe ser el dueño del referral
- Solo referidos con `approvalStatus: 'pending'` pueden ser aprobados/rechazados
- El afiliado debe tener `balance >= approvalFee` para aprobar
- Debe existir una configuración activa de approval fee
- Debe existir un usuario admin en el sistema con wallet
- Transacciones son atómicas (todo o nada)
- Idempotency key en transacciones para prevenir duplicados

### Frontend

- Validación de saldo insuficiente antes de permitir aprobar
- Botón de aprobar deshabilitado si no hay fondos
- Validación de monto en admin: >= 0, <= 1000
- Feedback visual claro de loading states
- Manejo de errores con mensajes descriptivos

---

## Integridad de Datos

### Transacciones Atómicas

Se utiliza `prisma.$transaction()` para garantizar:
- Si falla cualquier paso, se hace rollback completo
- No se pueden perder fondos
- No se pueden crear registros huérfanos
- Audit trail completo en tabla `transactions`

### Audit Trail

Cada aprobación genera:
```typescript
{
  type: 'transfer',
  amount: approvalFee,
  sourceWalletId: affiliateWallet.id,
  destinationWalletId: adminWallet.id,
  relatedEntityType: 'ReferralApproval',
  relatedEntityId: affiliationId,
  description: 'Referral approval fee for [User Name]',
  idempotencyKey: 'unique-key',
  metadata: {
    affiliationId,
    affiliateId,
    referredUserId,
    approvalConfigId
  }
}
```

---

## Casos Edge Manejados

1. **Saldo insuficiente**: Error claro al usuario antes de intentar aprobar
2. **No hay configuración activa**: Error 400 con mensaje descriptivo
3. **No hay admin en el sistema**: Error 500 con mensaje para contactar soporte
4. **Wallet del admin no existe**: Error 500 con mensaje para contactar soporte
5. **Referido ya aprobado/rechazado**: Error 400 indicando que solo se pueden aprobar 'pending'
6. **Usuario no es el dueño del referral**: Error 403 Forbidden
7. **Concurrencia en aprobaciones**: Manejado por transacciones atómicas de Prisma

---

## Testing Recomendado

### Unit Tests
- [ ] ApproveReferralUseCase: saldo suficiente
- [ ] ApproveReferralUseCase: saldo insuficiente
- [ ] ApproveReferralUseCase: ownership validation
- [ ] ApproveReferralUseCase: status validation
- [ ] RejectReferralUseCase: ownership validation
- [ ] RejectReferralUseCase: status validation

### Integration Tests
- [ ] POST /api/affiliate/referrals/[id]/approve: happy path
- [ ] POST /api/affiliate/referrals/[id]/approve: insufficient balance
- [ ] POST /api/affiliate/referrals/[id]/reject: happy path
- [ ] GET /api/admin/settings/referral-fee: admin only
- [ ] POST /api/admin/settings/referral-fee: update config

### E2E Tests
- [ ] Flujo completo de aprobación con balance check
- [ ] Flujo completo de rechazo
- [ ] Admin actualiza fee y afiliado ve nuevo monto
- [ ] Validación de saldo insuficiente en UI

---

## Deployment Checklist

- [x] Migración de base de datos aplicada
- [x] Seed de configuración inicial ejecutado
- [x] Backend compilado sin errores
- [x] Frontend compilado sin errores
- [ ] Verificar que existe al menos 1 admin con wallet en producción
- [ ] Monitorear logs de transacciones en primeras 24h
- [ ] Verificar que balance de wallets se mantiene consistente

---

## Archivos Modificados/Creados

### Base de Datos
- `/prisma/schema.prisma` (modificado)
- `/prisma/migrations/20251128025313_add_referral_approval_workflow/migration.sql` (creado)
- `/prisma/seed-referral-config.ts` (creado)

### Backend
- `/src/application/use-cases/ApproveReferralUseCase.ts` (creado)
- `/src/application/use-cases/RejectReferralUseCase.ts` (creado)
- `/src/app/api/affiliate/referrals/[id]/approve/route.ts` (creado)
- `/src/app/api/affiliate/referrals/[id]/reject/route.ts` (creado)
- `/src/app/api/affiliate/referrals/route.ts` (modificado)
- `/src/app/api/admin/settings/referral-fee/route.ts` (creado)

### Frontend - Types
- `/src/types/affiliate.ts` (modificado)

### Frontend - Components
- `/src/components/affiliate/ReferralApprovalStatusBadge.tsx` (creado)
- `/src/components/affiliate/ReferralApprovalDialog.tsx` (creado)
- `/src/components/affiliate/index.ts` (modificado)

### Frontend - Pages
- `/src/app/dashboard/affiliate/referrals-pending/page.tsx` (creado)
- `/src/app/dashboard/admin/settings/page.tsx` (creado)

### Frontend - Navigation
- `/src/components/layout/navigation/AffiliateNav.tsx` (modificado)
- `/src/components/layout/navigation/AdminNav.tsx` (modificado)

### Documentation
- `/REFERRAL_APPROVAL_WORKFLOW.md` (este archivo)

---

## Notas de Seguridad

1. **JWT Verification**: Todos los endpoints validan el token JWT
2. **Role Authorization**: Endpoints de admin verifican role === 'admin'
3. **Ownership Validation**: Solo el afiliado dueño puede aprobar/rechazar
4. **Transactional Integrity**: Uso de Prisma transactions para atomicidad
5. **Idempotency**: Cada transacción tiene idempotency key única
6. **Input Validation**: Validación de montos en backend y frontend
7. **Error Handling**: Mensajes de error no exponen detalles internos

---

## Métricas a Monitorear

1. **Tasa de aprobación**: approved / (approved + rejected)
2. **Promedio de tiempo para aprobar**: approvedAt - createdAt
3. **Referidos rechazados por saldo insuficiente**: tracking en logs
4. **Valor total de fees cobrados**: SUM(approvalFee) de transacciones
5. **Balance del wallet de admin**: Debe incrementar con cada aprobación

---

## Soporte y Contacto

Para preguntas sobre esta implementación:
- Revisar este documento
- Consultar código fuente con comentarios JSDoc
- Revisar logs de transacciones en `/api/admin/transactions`

---

**Última actualización**: 2025-11-27
**Versión de implementación**: 1.0.0
