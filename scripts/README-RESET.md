# Reset de Base de Datos

Este script resetea completamente la base de datos y crea usuarios de prueba con sus configuraciones iniciales.

## Uso

```bash
npm run db:reset
```

O directamente:

```bash
npx tsx scripts/reset-database.ts
```

## ⚠️ ADVERTENCIA

**Este script elimina TODOS los datos de la base de datos.** Use solo en entornos de desarrollo.

## Datos creados

### Usuarios

| Rol | Email | Password | Wallet |
|-----|-------|----------|--------|
| Admin | admin@streamsales.com | admin123 | $0.00 |
| Provider | provider@streamsales.com | provider123 | $0.00 |
| Seller | seller@streamsales.com | seller123 | $100.00 |
| Affiliate | affiliate@streamsales.com | affiliate123 | $150.00 |

### Configuraciones

- **Comisión de venta**: 15%
- **Comisión de registro**: $5.00
- **Cuota de aprobación de referidos**: $10.00
- **Tipo de cambio Perú**: 1 USD = 3.75 PEN

### Código de referido

El afiliado está configurado con el código: **AFFILIATE2024**

## Proceso

El script realiza las siguientes acciones en orden:

1. **Limpieza** - Elimina todos los datos respetando foreign keys:
   - Mensajes y disputas
   - Items y órdenes
   - Inventario (slots, accounts, licenses, content)
   - Productos y variantes
   - Transacciones de wallet
   - Recargas y retiros
   - Wallets
   - Métodos de pago
   - Tasas de cambio
   - Afiliaciones y perfiles de afiliado
   - Perfiles de provider y validator
   - Configuraciones
   - Usuarios

2. **Seed** - Crea datos iniciales:
   - 4 usuarios (Admin, Provider, Seller, Affiliate)
   - Wallets para cada usuario
   - Configuraciones de comisiones
   - Configuración de aprobación de referidos
   - Tipo de cambio para Perú

## Estructura de datos

### Admin
- Usuario con permisos completos del sistema
- Wallet vacío

### Provider
- Proveedor aprobado listo para crear productos
- Perfil de provider con status `approved`
- Wallet vacío

### Seller
- Vendedor con balance inicial de $100
- Puede comprar productos del marketplace
- Puede crear disputas

### Affiliate
- Afiliado aprobado con balance de $150
- Código de referido: `AFFILIATE2024`
- Puede referir nuevos usuarios
- Puede aprobar referidos (con cargo de $10)
- **Ahora también puede comprar productos del marketplace**

## Desarrollo futuro

Para agregar más datos iniciales, edita el archivo `scripts/reset-database.ts` y añade las creaciones necesarias después de los usuarios existentes.
