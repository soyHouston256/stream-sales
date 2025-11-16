# Scripts de Mantenimiento

Este directorio contiene scripts de mantenimiento y migración para el proyecto stream-sales.

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
