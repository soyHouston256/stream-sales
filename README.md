# Stream Sales - Login & Dashboard con DDD

Sistema de autenticación y dashboard implementado con arquitectura DDD (Domain-Driven Design), Next.js, Prisma y JWT.

## Arquitectura

El proyecto sigue los principios de **Domain-Driven Design** con la siguiente estructura:

```
src/
├── domain/              # Capa de Dominio
│   ├── entities/        # Entidades del negocio
│   ├── value-objects/   # Objetos de valor
│   ├── repositories/    # Interfaces de repositorios
│   └── exceptions/      # Excepciones del dominio
├── application/         # Capa de Aplicación
│   └── use-cases/       # Casos de uso del negocio
├── infrastructure/      # Capa de Infraestructura
│   ├── database/        # Configuración de Prisma
│   ├── repositories/    # Implementaciones de repositorios
│   └── auth/           # Servicios de autenticación (JWT, middleware)
└── app/                # Next.js App Router
    ├── api/            # API Routes
    ├── login/          # Página de Login
    ├── register/       # Página de Registro
    └── dashboard/      # Página de Dashboard
```

## Características

- Arquitectura DDD con separación clara de capas
- Autenticación con JWT
- Validación de datos con Value Objects
- Casos de uso reutilizables
- Tests unitarios completos
- API RESTful protegida
- Prisma ORM con SQLite
- Next.js 14 con App Router
- TypeScript

## Requisitos Previos

- Node.js 18+
- npm o yarn

## Instalación

1. Clonar el repositorio:
```bash
git clone <repository-url>
cd stream-sales
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno:
```bash
cp .env.example .env
```

Editar `.env` con tus valores:
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="tu-clave-secreta-segura"
JWT_EXPIRES_IN="7d"
```

4. Ejecutar migraciones de Prisma:
```bash
npm run prisma:migrate
```

5. Generar cliente de Prisma:
```bash
npm run prisma:generate
```

## Uso

### Desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

### Build para Producción

```bash
npm run build
npm start
```

### Tests

Ejecutar todos los tests:
```bash
npm test
```

Ejecutar tests en modo watch:
```bash
npm run test:watch
```

## API Endpoints

### POST /api/auth/register
Registrar nuevo usuario.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe" // opcional
}
```

**Response:**
```json
{
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  },
  "token": "jwt-token"
}
```

### POST /api/auth/login
Iniciar sesión.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  },
  "token": "jwt-token"
}
```

### GET /api/auth/me
Obtener información del usuario actual (requiere autenticación).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  }
}
```

## Flujo de Autenticación

1. El usuario se registra o inicia sesión
2. La API genera un JWT con información del usuario
3. El frontend guarda el token en localStorage
4. Las peticiones subsecuentes incluyen el token en el header `Authorization`
5. El middleware valida el token y permite/deniega el acceso

## Estructura DDD

### Domain Layer
- **Entities**: `User` - Lógica central del usuario
- **Value Objects**: `Email`, `Password` - Validación y encapsulación
- **Repository Interfaces**: Contratos para persistencia
- **Exceptions**: Errores específicos del dominio

### Application Layer
- **Use Cases**:
  - `RegisterUserUseCase` - Registro de usuarios
  - `LoginUserUseCase` - Autenticación
  - `GetUserByIdUseCase` - Obtener usuario

### Infrastructure Layer
- **PrismaUserRepository**: Implementación del repositorio con Prisma
- **JwtService**: Manejo de tokens JWT
- **Middleware**: Protección de rutas

## Tests

El proyecto incluye tests unitarios para:

- Value Objects (Email, Password)
- Entities (User)
- Use Cases (Register, Login, GetUserById)

Todos los tests están en carpetas `__tests__` junto al código que prueban.

## Prisma Studio

Para ver y editar datos de la base de datos:

```bash
npm run prisma:studio
```

## Scripts Disponibles

- `npm run dev` - Inicia servidor de desarrollo
- `npm run build` - Construye para producción
- `npm start` - Inicia servidor de producción
- `npm test` - Ejecuta tests
- `npm run test:watch` - Tests en modo watch
- `npm run prisma:generate` - Genera cliente Prisma
- `npm run prisma:migrate` - Ejecuta migraciones
- `npm run prisma:studio` - Abre Prisma Studio

## Tecnologías Utilizadas

- **Next.js 14** - Framework React
- **TypeScript** - Tipado estático
- **Prisma** - ORM
- **SQLite** - Base de datos
- **JWT** - Autenticación
- **bcryptjs** - Hash de contraseñas
- **Jest** - Testing
- **Zod** - Validación de esquemas

## Seguridad

- Contraseñas hasheadas con bcrypt
- Tokens JWT con expiración configurable
- Validación de datos con Value Objects
- Middleware de autenticación para rutas protegidas
- Variables de entorno para secretos

## Licencia

MIT
