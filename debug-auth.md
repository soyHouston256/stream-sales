# Debug de Autenticación - Guía Paso a Paso

## 1. Verificar que el servidor está corriendo

```bash
npm run dev
```

Deberías ver:
```
- Local:        http://localhost:3000
```

## 2. Abrir DevTools en el navegador

1. Ve a: http://localhost:3000/login
2. Presiona F12 (o clic derecho → Inspeccionar)
3. Ve a la pestaña **Console**
4. Ve a la pestaña **Network**
5. En Network, haz clic en el filtro **"Fetch/XHR"**

## 3. Hacer Login

1. Ingresa email y password
2. Haz clic en "Login"

## 4. Ver los logs

### En la pestaña Console del navegador deberías ver:

```
[Login] Login successful, token received
[Login] Token length: XXX
[Login] Token stored in localStorage
[Login] Server has set the auth cookie
[Login] Redirecting to dashboard...
```

### En la pestaña Network (con filtro Fetch/XHR):

Deberías ver un request llamado **"login"**:
- **URL**: http://localhost:3000/api/auth/login
- **Method**: POST
- **Status**: 200 (si es exitoso)

**HAZ CLIC en ese request "login"** y verás:
- **Headers tab**: Información del request
- **Response tab**: La respuesta JSON con `{user: {...}, token: "..."}`
- **Cookies tab**: La cookie "token" que se estableció

### En la terminal del servidor deberías ver:

```
prisma:query SELECT ... FROM "users" WHERE "email" = $1
POST /api/auth/login 200 in XXXms
[Login API] Token cookie set for user: tu@email.com
[Middleware] Dashboard access attempt
[Middleware] Token found in cookie: true
[Middleware] Path: /dashboard
[Middleware] Token valid for user: tu@email.com
```

## 5. Qué revisar si NO funciona

### Caso A: Login retorna 401 o 400
- ❌ Credenciales incorrectas
- ❌ Usuario no existe
- **Solución**: Verifica email/password o regístrate primero

### Caso B: Login retorna 200 pero te redirige a /login
- ❌ Cookie no se está estableciendo
- ❌ Token inválido

**En la terminal busca**:
```
[Middleware] Token found in cookie: false
```

**En Network tab**:
1. Clic en el request "login"
2. Ve a la pestaña "Headers"
3. Busca la sección "Response Headers"
4. ¿Ves un header "Set-Cookie" con "token=..."?

### Caso C: Ves el dashboard por un segundo y luego vuelves a /login
- ❌ El middleware está rechazando el token

**En la terminal busca**:
```
[Middleware] Token validation failed: XXX
```

Posibles causas:
- JWT_SECRET cambió o no está definido
- Token malformado

## 6. Verificar cookies manualmente

En DevTools:
1. Ve a **Application** tab
2. En el menú izquierdo: **Storage → Cookies → http://localhost:3000**
3. Deberías ver una cookie llamada **"token"** con:
   - Name: `token`
   - Value: `eyJhbGc...` (un JWT largo)
   - Path: `/`
   - Expires: (fecha 7 días en el futuro)

## 7. Comandos útiles de diagnóstico

### Verificar variable de entorno JWT_SECRET
```bash
cat .env | grep JWT_SECRET
```

### Limpiar todo y empezar de nuevo
```bash
# Detener el servidor (Ctrl+C)
# Limpiar node_modules si es necesario
rm -rf .next
npm run dev
```

### Ver logs del servidor con más detalle
El servidor ya tiene logs de debug. Solo ejecuta:
```bash
npm run dev
```

Y observa la terminal mientras haces login.

## 8. Checklist rápido

- [ ] El servidor está corriendo (`npm run dev`)
- [ ] Puedo acceder a http://localhost:3000/login
- [ ] Tengo un usuario registrado (o me registro primero)
- [ ] Veo el request "login" en Network tab con status 200
- [ ] Veo el log "[Login API] Token cookie set..." en la terminal
- [ ] Veo el log "[Middleware] Token found in cookie: true" en la terminal
- [ ] Veo la cookie "token" en Application → Cookies
- [ ] Se me redirige a /dashboard

## 9. Si nada funciona

Comparte los siguientes datos:

1. **Los logs de la terminal del servidor** (toda la salida desde que haces login)
2. **Los logs de la consola del navegador** (pestaña Console)
3. **Screenshot del Network tab** mostrando el request "login"
4. **Screenshot de Application → Cookies** mostrando las cookies

Con eso puedo diagnosticar exactamente qué está pasando.
