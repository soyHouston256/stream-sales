# Guía de Despliegue AWS (MVP Económico)

Esta guía te ayudará a desplegar tu aplicación Next.js en AWS utilizando una arquitectura "Serverless" optimizada para costos.

## Arquitectura

- **Frontend/Backend**: AWS Lambda + CloudFront (vía OpenNext). Costo: Pago por uso (Free tier generoso).
- **Base de Datos**: Amazon RDS PostgreSQL (t4g.micro). Costo: Elegible para Free Tier (12 meses), luego ~$15/mes.
- **Almacenamiento**: Amazon S3. Costo: Muy bajo (<$1/mes).
- **Red**: VPC sin NAT Gateway (ahorro de ~$32/mes).

## Prerrequisitos

1.  Tener configuradas las credenciales de AWS (`aws configure`).
2.  Tener Node.js instalado.

## Pasos para Desplegar

### 1. Instalar Dependencias de Infraestructura

```bash
cd infrastructure
npm install
cd ..
```

### 2. Construir la Aplicación

Utilizamos `open-next` para adaptar Next.js a AWS Lambda.

```bash
# Ejecutar desde la raíz del proyecto
./infrastructure/node_modules/.bin/open-next build
```

Esto creará una carpeta `.open-next` con los artefactos de despliegue.

### 3. Desplegar la Infraestructura

```bash
cd infrastructure
npm run deploy:mvp
```

Este comando desplegará el stack `StreamSalesMvp-dev`. Tardará unos minutos.

### 4. Verificar el Despliegue

Al finalizar, verás en la terminal unos "Outputs" similares a estos:

-   `StreamSalesMvp-dev.CloudFrontURL`: La URL de tu web.
-   `StreamSalesMvp-dev.DatabaseConnectCommand`: Comando para obtener la conexión a la BD.

## Notas Importantes

-   **Base de Datos**: La base de datos se crea en una subred privada. Para conectarte desde tu máquina local, necesitarías una instancia EC2 bastión o una VPN, pero para el MVP la Lambda tiene acceso directo.
-   **Migraciones**: Prisma necesita ejecutarse contra la base de datos. Como la BD está aislada, la forma más económica de correr migraciones es invocando una función Lambda o temporalmente haciendo la BD pública (no recomendado) o usando una instancia EC2 pequeña como túnel.
    -   *Sugerencia*: Para la primera vez, puedes desplegar una instancia EC2 t4g.nano en la misma VPC, conectarte por SSH y correr las migraciones desde ahí.

## Limpieza (Destruir todo)

Si quieres borrar todo para dejar de pagar:

```bash
cd infrastructure
npm run destroy:mvp
```
