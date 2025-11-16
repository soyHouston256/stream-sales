# Scripts de Mantenimiento

Este directorio contiene scripts de mantenimiento y migración para el proyecto stream-sales.

## seed-admin.ts

### Propósito
Crea el usuario administrador con wallet necesario para el funcionamiento del sistema de comisiones.

### Cuándo usar este script
- **REQUERIDO**: Antes de realizar la primera compra en el sistema
- Después de resetear la base de datos
- Si el error "Admin wallet not found" aparece al intentar comprar productos
- En nuevas instalaciones del sistema

### Uso
```bash
npm run seed:admin
```

### Qué hace el script
1. ✅ Verifica si existe un usuario con role 'admin'
2. ✅ Si existe, verifica que tenga wallet
3. ✅ Si no existe, crea usuario admin con email y password por defecto
4. ✅ Crea wallet para el admin con balance inicial de $0
5. ✅ Es idempotente - puede ejecutarse múltiples veces sin problemas

### Credenciales por defecto
```
Email:    admin@streamsales.com
Password: admin123
```

⚠️ **IMPORTANTE**: Cambiar el password después del primer login en producción.

### Salida esperada
```
🌱 Iniciando seed de usuario admin...

📝 No existe usuario admin. Creando...

============================================================
✅ USUARIO ADMIN CREADO EXITOSAMENTE
============================================================
Email:    admin@streamsales.com
Password: admin123
Role:     admin
Wallet:   ckl8x9y2z000001l6h8j9k0m1 (Balance: $0)
============================================================

⚠️  IMPORTANTE: Cambia el password del admin después de iniciar sesión

🎉 Seed completado
```

### Por qué es necesario
El sistema de compras requiere una wallet de administrador para depositar las comisiones. Cuando un seller compra un producto:
1. Se debita el monto total del seller
2. Se acredita la comisión (5%) a la wallet del admin
3. Se acredita el earnings (95%) a la wallet del provider

Sin la wallet del admin, las compras fallarán con el error: "Admin wallet not found"

---

## migrate-encrypt-passwords.ts

### Propósito
Re-encripta todos los passwords de productos que están en texto plano al formato encriptado AES-256-CBC.

### Cuándo usar este script
- Después de implementar el sistema de encriptación en un sistema existente
- Si tienes productos con passwords en texto plano en la base de datos
- Para asegurar que todos los passwords cumplan con estándares de seguridad

### Pre-requisitos
```bash
# Instalar tsx si no está instalado
npm install -D tsx

# Asegurar que ENCRYPTION_KEY está configurada en .env
echo "ENCRYPTION_KEY=your-secure-32-byte-key-here" >> .env
```

### Uso

#### Paso 1: Backup de la base de datos
```bash
# PostgreSQL ejemplo
pg_dump -U usuario -d stream_sales > backup_$(date +%Y%m%d_%H%M%S).sql
```

#### Paso 2: Ejecutar el script
```bash
npx tsx scripts/migrate-encrypt-passwords.ts
```

### Qué hace el script
1. ✅ Lee todos los productos de la base de datos
2. ✅ Detecta qué passwords están en texto plano vs encriptados
3. ✅ Encripta los passwords en texto plano usando AES-256-CBC
4. ✅ Actualiza la base de datos con los passwords encriptados
5. ✅ Muestra un resumen detallado de la operación

### Salida esperada
```
🔐 Iniciando migración de passwords...

📦 Encontrados 15 productos en total

✓ netflix (a1b2c3d4...) - Ya encriptado
🔒 spotify (e5f6g7h8...) - Encriptado exitosamente
🔒 hbo (i9j0k1l2...) - Encriptado exitosamente
...

============================================================
📊 RESUMEN DE MIGRACIÓN
============================================================
Total de productos:           15
Ya encriptados (sin cambios):  5
Recién encriptados:            10
Errores:                       0
============================================================

✅ Migración completada exitosamente
   Todos los passwords ahora están encriptados con AES-256-CBC

🎉 Script finalizado
```

### Seguridad

- ✅ **Idempotente**: Puede ejecutarse múltiples veces sin problemas
- ✅ **No destructivo**: Solo actualiza passwords que NO están encriptados
- ✅ **Verificación**: Detecta automáticamente el formato actual del password
- ⚠️ **Backup recomendado**: Siempre hacer backup antes de ejecutar

### Notas importantes

1. **ENCRYPTION_KEY**: El script usa la misma `ENCRYPTION_KEY` que la aplicación. Asegúrate de que coincida.

2. **Formato de encriptación**:
   - Algoritmo: AES-256-CBC
   - Formato: `{iv_hex}:{encrypted_hex}`
   - IV length: 16 bytes

3. **Compatibilidad**: El código de la aplicación ya maneja ambos formatos (encriptado y texto plano) durante la transición.

4. **Después de la migración**: Una vez completada la migración, todos los productos tendrán passwords encriptados y serán más seguros.

### Troubleshooting

#### Error: "ENCRYPTION_KEY is not defined"
**Solución**: Configurar la variable de entorno en `.env`

#### Error: "Database connection failed"
**Solución**: Verificar que `DATABASE_URL` esté configurada correctamente y la base de datos esté accesible

#### Error: "Permission denied"
**Solución**: Asegurar que el usuario de la base de datos tenga permisos de UPDATE en la tabla `products`

### Soporte
Si encuentras problemas, revisa:
1. Los logs del script (muestra detalles de cada operación)
2. La configuración de `.env`
3. Los permisos de la base de datos

---

## migrate-purchases-to-completed.ts

### Propósito
Actualiza todas las compras con status 'pending' a 'completed' y establece la fecha de completado.

### Cuándo usar este script
- Después de actualizar el código que cambia cómo se guardan las compras
- Si tienes compras antiguas que quedaron con status 'pending'
- Para corregir compras que se completaron exitosamente pero quedaron marcadas como pendientes

### Uso
```bash
npm run migrate:purchases-completed
```

### Qué hace el script
1. ✅ Cuenta todas las compras con status 'pending'
2. ✅ Actualiza el status a 'completed'
3. ✅ Establece completedAt = fecha actual
4. ✅ Verifica que no queden compras pendientes
5. ✅ Muestra estadísticas finales por status
6. ✅ Es idempotente - puede ejecutarse múltiples veces sin problemas

### Salida esperada
```
🔄 Iniciando migración de compras pendientes...

📊 Encontradas 3 compras con status 'pending'

✅ Migración completada: 3 compras actualizadas

✅ Verificación exitosa: No quedan compras pendientes

📈 Estadísticas finales de compras por status:
   - completed: 15 compras

✅ Migración finalizada exitosamente
```

### Contexto técnico
En versiones anteriores del código, las compras se guardaban con status 'pending' por defecto y nunca se actualizaban a 'completed'. Esto es técnicamente incorrecto porque:

1. Una compra que llega al método `save()` del repository ya completó exitosamente todas las transacciones
2. El status debería reflejar que la compra se completó (todas las wallets actualizadas, producto marcado como vendido)
3. El status 'pending' debería reservarse solo para compras que están en proceso o esperando confirmación de pago

### Por qué es seguro
- Solo actualiza compras con status 'pending'
- No modifica compras con status 'failed' o 'refunded'
- Las compras son registros de auditoría, no afectan el balance de wallets (ya actualizados cuando se creó la compra)
- Es idempotente - ejecutarlo múltiples veces no causa efectos secundarios

### Notas importantes
1. **No afecta balances**: Las wallets ya fueron actualizadas cuando se creó la compra originalmente
2. **Solo cambio de status**: Este script solo actualiza metadatos (status y timestamp), no datos financieros
3. **Después del fix**: Las nuevas compras se guardan automáticamente como 'completed', este script es solo para limpiar datos históricos
