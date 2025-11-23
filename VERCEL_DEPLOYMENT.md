# Guía de Despliegue en Vercel

Esta guía te ayudará a desplegar la aplicación Stream Sales en Vercel.

## Requisitos Previos

1. Una cuenta en [Vercel](https://vercel.com)
2. Tu proyecto en GitHub
3. Una base de datos PostgreSQL (puedes usar Vercel Postgres, Neon, Supabase, etc.)

## Pasos para Desplegar

### 1. Preparar la Base de Datos

Tienes varias opciones para la base de datos:

#### Opción A: Vercel Postgres (Recomendado)
1. Ve a tu proyecto en Vercel Dashboard
2. Navega a la pestaña "Storage"
3. Crea una nueva base de datos Postgres
4. Vercel automáticamente configurará las variables de entorno necesarias

#### Opción B: Base de Datos Externa (Neon, Supabase, etc.)
1. Crea una base de datos PostgreSQL en tu proveedor preferido
2. Obtén la URL de conexión
3. Agrega la variable de entorno `DATABASE_URL` en Vercel (paso 3)

### 2. Conectar tu Repositorio con Vercel

1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Haz clic en "Add New Project"
3. Importa tu repositorio de GitHub
4. Vercel detectará automáticamente que es una aplicación Next.js

### 3. Configurar Variables de Entorno

En la configuración del proyecto en Vercel, agrega las siguientes variables de entorno:

```
# Base de Datos
DATABASE_URL=tu-url-de-conexion-postgresql
# Si usas Vercel Postgres, esta variable se configura automáticamente como POSTGRES_URL

# JWT
JWT_SECRET=tu-clave-secreta-muy-segura-aqui
JWT_EXPIRES_IN=7d

# Entorno
NODE_ENV=production
```

**Importante**: Si usas Vercel Postgres, la variable `POSTGRES_URL` se configura automáticamente. El código está preparado para usar tanto `DATABASE_URL` como `POSTGRES_URL`.

### 4. Configurar el Build Command

Vercel debería detectar automáticamente los comandos de build, pero si necesitas configurarlos manualmente:

- **Build Command**: `prisma generate && next build`
- **Install Command**: `npm install`
- **Output Directory**: `.next`

Estos valores ya están configurados en `vercel.json`.

### 5. Desplegar

1. Haz clic en "Deploy"
2. Vercel comenzará el proceso de build y despliegue
3. Una vez completado, recibirás una URL de producción

### 6. Ejecutar Migraciones de Base de Datos

Después del primer despliegue, necesitas ejecutar las migraciones de Prisma:

#### Opción A: Desde tu máquina local
```bash
# Asegúrate de tener la DATABASE_URL configurada
export DATABASE_URL="tu-url-de-base-de-datos"

# Ejecutar migraciones
npx prisma migrate deploy

# Generar cliente de Prisma (opcional, ya se hace en el build)
npx prisma generate
```

#### Opción B: Usando Vercel CLI
```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Link al proyecto
vercel link

# Ejecutar comando
vercel env pull .env.local
npx prisma migrate deploy
```

### 7. Seeds Iniciales (Opcional)

Si necesitas crear datos iniciales:

```bash
npm run seed:admin
npm run seed:commission-config
```

## Despliegues Automáticos

Vercel automáticamente desplegará tu aplicación cuando:
- Hagas push a la rama `main` (producción)
- Hagas push a cualquier otra rama (preview deployment)

## Variables de Entorno por Ambiente

Puedes configurar diferentes variables de entorno para:
- **Production**: Variables que se usan en la rama main
- **Preview**: Variables para branches de preview
- **Development**: Variables para desarrollo local

## Dominios Personalizados

1. Ve a Settings > Domains en tu proyecto de Vercel
2. Agrega tu dominio personalizado
3. Configura los registros DNS según las instrucciones de Vercel

## Monitoreo y Logs

- **Logs**: Ve a la pestaña "Deployments" y haz clic en un deployment para ver los logs
- **Analytics**: Vercel provee analytics integrados
- **Speed Insights**: Puedes habilitar Speed Insights para monitorear el rendimiento

## Solución de Problemas

### Error: "Failed to connect to database"
- Verifica que `DATABASE_URL` o `POSTGRES_URL` esté configurada correctamente
- Asegúrate de que tu base de datos permite conexiones desde Vercel
- Revisa que las credenciales sean correctas

### Error en las migraciones de Prisma
- Asegúrate de ejecutar `prisma generate` antes del build
- Verifica que el schema de Prisma esté sincronizado con tu base de datos

### Build timeout
- Verifica que no haya errores en el código
- Revisa los logs de build en Vercel

## Recursos Adicionales

- [Documentación de Vercel](https://vercel.com/docs)
- [Next.js en Vercel](https://vercel.com/docs/frameworks/nextjs)
- [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)
- [Prisma con Vercel](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel)

## Comandos Útiles

```bash
# Ver logs de producción
vercel logs

# Ver lista de deployments
vercel ls

# Revertir a un deployment anterior
vercel rollback

# Ver variables de entorno
vercel env ls
```
