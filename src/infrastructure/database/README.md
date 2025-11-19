# Prisma Database Infrastructure

This directory contains the database infrastructure layer with AWS Secrets Manager integration for secure credential management in production environments.

## Overview

The Prisma client initialization has been designed to support both local development and AWS production deployments with automatic environment detection and secure credential retrieval.

## Features

- **Dual Environment Support**: Automatically switches between `.env` (development) and AWS Secrets Manager (production)
- **Connection Pooling**: Configures optimal connection pool settings for serverless environments
- **Retry Logic**: Implements exponential backoff for connection failures
- **Hot Reload Support**: Singleton pattern prevents multiple instances during Next.js development
- **Graceful Shutdown**: Proper cleanup of database connections on application termination
- **Security**: Passwords are URL-encoded and never logged in plain text
- **Type Safety**: Full TypeScript support with proper interfaces

## Architecture

```
prisma.ts
├── getDatabaseConfig()                    # Environment-aware config selector
│   ├── Development → DATABASE_URL         # Uses .env file
│   └── Production → AWS Secrets Manager   # Uses AWS SDK
├── getDatabaseConfigFromSecretsManager()  # AWS integration
├── initializePrismaClient()               # Connection with retry logic
└── prisma (export)                        # Singleton Proxy instance
```

## Usage

### In API Routes

```typescript
import { prisma } from '@/infrastructure/database/prisma';

export async function GET() {
  const users = await prisma.user.findMany();
  return Response.json(users);
}
```

### In Repositories

```typescript
import { prisma } from '@/infrastructure/database/prisma';

export class PrismaUserRepository implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    const userData = await prisma.user.findUnique({ where: { id } });
    return userData ? User.fromPersistence(userData) : null;
  }
}
```

### In Scripts

```typescript
import { prisma, disconnectPrisma } from '@/infrastructure/database/prisma';

async function seedDatabase() {
  try {
    await prisma.user.create({ data: { /* ... */ } });
  } finally {
    await disconnectPrisma();
  }
}
```

## Environment Configuration

### Development (.env)

```env
NODE_ENV=development
DATABASE_URL="postgresql://user:password@localhost:5432/dbname?schema=public"
```

### Production (AWS Lambda/ECS)

```env
NODE_ENV=production
AWS_SECRET_NAME="stream-sales/database/credentials"
AWS_REGION="us-east-1"
```

## AWS Secrets Manager Setup

### 1. Create Secret in AWS Console

Navigate to AWS Secrets Manager and create a new secret with the following JSON structure:

```json
{
  "host": "stream-sales-db.abc123.us-east-1.rds.amazonaws.com",
  "port": "5432",
  "username": "dbadmin",
  "password": "YourSecurePassword123!",
  "dbname": "streams",
  "engine": "postgres"
}
```

### 2. Using AWS CLI

```bash
aws secretsmanager create-secret \
  --name stream-sales/database/credentials \
  --description "Stream Sales RDS PostgreSQL credentials" \
  --secret-string '{
    "host": "stream-sales-db.abc123.us-east-1.rds.amazonaws.com",
    "port": "5432",
    "username": "dbadmin",
    "password": "YourSecurePassword123!",
    "dbname": "streams",
    "engine": "postgres"
  }' \
  --region us-east-1
```

### 3. IAM Permissions

Your Lambda execution role or ECS task role needs the following permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:stream-sales/database/credentials-*"
    }
  ]
}
```

### 4. CDK Integration Example

```typescript
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

// Create RDS secret
const dbSecret = new secretsmanager.Secret(this, 'DatabaseSecret', {
  secretName: 'stream-sales/database/credentials',
  generateSecretString: {
    secretStringTemplate: JSON.stringify({
      username: 'dbadmin',
      engine: 'postgres',
      host: rdsInstance.dbInstanceEndpointAddress,
      port: '5432',
      dbname: 'streams',
    }),
    generateStringKey: 'password',
    excludePunctuation: true,
    passwordLength: 32,
  },
});

// Grant Lambda access to secret
dbSecret.grantRead(lambdaFunction);

// Add environment variables
lambdaFunction.addEnvironment('AWS_SECRET_NAME', dbSecret.secretName);
lambdaFunction.addEnvironment('AWS_REGION', this.region);
lambdaFunction.addEnvironment('NODE_ENV', 'production');
```

## Connection Configuration

### Connection Pooling

The client automatically configures connection pooling for serverless environments:

```
postgresql://user:pass@host:5432/db?schema=public&connection_limit=5&pool_timeout=20
```

**Parameters:**
- `connection_limit=5`: Max 5 connections per Lambda instance (prevents exhaustion)
- `pool_timeout=20`: 20-second timeout for acquiring connections
- `schema=public`: Default PostgreSQL schema

### Retry Logic

The initialization implements exponential backoff:

| Attempt | Delay |
|---------|-------|
| 1       | 0ms   |
| 2       | 1000ms (1s) |
| 3       | 2000ms (2s) |

After 3 failed attempts, the application exits with error code 1.

## Security Considerations

### Password Encoding

All passwords are URL-encoded to handle special characters:

```typescript
const dbUrl = `postgresql://${secret.username}:${encodeURIComponent(secret.password)}@...`;
```

This prevents issues with passwords containing `@`, `:`, `/`, or other special characters.

### Logging

- **Development**: Logs queries, errors, and warnings
- **Production**: Logs only errors and warnings (no query logging)
- **Credentials**: Never logged in plain text (only host/port/database name)

### Connection Security

For production RDS:
- Enable SSL/TLS connections by adding `?sslmode=require` to the connection string
- Use IAM database authentication where possible
- Rotate secrets regularly using AWS Secrets Manager rotation

## Troubleshooting

### Issue: "Prisma Client not initialized"

**Cause**: The client proxy is accessed before async initialization completes.

**Solution**: Ensure you're using the client in async contexts (API routes, async functions).

```typescript
// ✅ Correct
export async function GET() {
  const users = await prisma.user.findMany();
  return Response.json(users);
}

// ❌ Incorrect (top-level synchronous access)
const users = prisma.user.findMany(); // Will throw
```

### Issue: "Failed to connect to database after 3 attempts"

**Causes:**
1. Incorrect DATABASE_URL or AWS_SECRET_NAME
2. Database is not running or unreachable
3. Network/VPC configuration issues (AWS)
4. Invalid credentials

**Solutions:**
1. Verify environment variables are set correctly
2. Test database connectivity: `psql $DATABASE_URL`
3. Check security groups and VPC configuration (AWS)
4. Validate secret format in AWS Secrets Manager

### Issue: "Secret is missing required fields"

**Cause**: AWS secret doesn't contain all required fields.

**Solution**: Ensure your secret has all required fields:
- `host`
- `port`
- `username`
- `password`
- `dbname`

### Issue: Connection pool exhaustion

**Symptoms:**
- "Timeout while trying to acquire a connection"
- Slow API responses

**Solutions:**
1. Reduce `connection_limit` in the connection string
2. Ensure Lambda concurrent executions are reasonable
3. Implement connection pooling with RDS Proxy
4. Check for connection leaks (missing `await` on queries)

## Migration to AWS

### Step 1: Test Locally with Secret

```bash
# Set production environment variables locally
export NODE_ENV=production
export AWS_SECRET_NAME=stream-sales/database/credentials
export AWS_REGION=us-east-1

# Test the application
npm run dev
```

### Step 2: Update CDK Configuration

Add environment variables to your CDK stack:

```typescript
const nextjsFunction = new lambda.Function(this, 'NextjsFunction', {
  environment: {
    NODE_ENV: 'production',
    AWS_SECRET_NAME: dbSecret.secretName,
    AWS_REGION: this.region,
  },
});
```

### Step 3: Deploy and Verify

```bash
cdk deploy

# Check logs for connection success
aws logs tail /aws/lambda/stream-sales-nextjs --follow
```

Look for:
```
[Prisma] Production environment detected, using AWS Secrets Manager
[Prisma] Retrieving database credentials from AWS Secrets Manager: stream-sales/database/credentials
[Prisma] Successfully retrieved database credentials for stream-sales-db.abc123.us-east-1.rds.amazonaws.com:5432/streams
[Prisma] Database connection established successfully
```

## Performance Optimization

### Use RDS Proxy (Recommended for Production)

RDS Proxy provides connection pooling and improves performance for serverless applications:

```typescript
// CDK Example
import * as rds from 'aws-cdk-lib/aws-rds';

const dbProxy = new rds.DatabaseProxy(this, 'DatabaseProxy', {
  proxyTarget: rds.ProxyTarget.fromInstance(rdsInstance),
  secrets: [dbSecret],
  vpc,
  requireTLS: true,
});

// Update secret with proxy endpoint
const proxySecret = new secretsmanager.Secret(this, 'ProxySecret', {
  secretName: 'stream-sales/database/credentials',
  secretObjectValue: {
    host: cdk.SecretValue.unsafePlainText(dbProxy.endpoint),
    port: cdk.SecretValue.unsafePlainText('5432'),
    // ... other fields
  },
});
```

Benefits:
- Connection pooling across Lambda instances
- Reduced connection overhead
- Automatic failover support
- IAM authentication support

### Prisma Accelerate (Optional)

For additional performance, consider Prisma Accelerate:

```typescript
// In production
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_WITH_ACCELERATE,
    },
  },
});
```

## Testing

### Unit Tests

```typescript
import { prisma, disconnectPrisma } from '@/infrastructure/database/prisma';

describe('Database Integration', () => {
  afterAll(async () => {
    await disconnectPrisma();
  });

  it('should connect and query database', async () => {
    const result = await prisma.$queryRaw`SELECT 1 as value`;
    expect(result).toHaveLength(1);
  });
});
```

### Integration Tests

Use a test database for integration tests:

```typescript
// jest.setup.js
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/streams_test?schema=public';
process.env.NODE_ENV = 'test';
```

## Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [AWS Secrets Manager Documentation](https://docs.aws.amazon.com/secretsmanager/)
- [RDS Proxy Documentation](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy.html)
- [Next.js Database Best Practices](https://nextjs.org/docs/app/building-your-application/data-fetching/fetching-caching-and-revalidating)

## Support

For issues or questions:
1. Check CloudWatch Logs for detailed error messages
2. Verify AWS IAM permissions
3. Test database connectivity from Lambda/ECS environment
4. Review this documentation for common issues
