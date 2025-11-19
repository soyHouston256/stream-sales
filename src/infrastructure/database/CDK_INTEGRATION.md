# CDK Integration Guide for Prisma Database

This guide demonstrates how to integrate the Prisma database client with AWS CDK for production deployment.

## Overview

The Prisma client automatically detects the environment and uses:
- **Development**: `DATABASE_URL` from `.env` file
- **Production**: AWS Secrets Manager via `AWS_SECRET_NAME`

## Prerequisites

1. AWS CDK installed: `npm install -g aws-cdk`
2. AWS credentials configured
3. RDS PostgreSQL instance (or plan to create one)

## Step 1: Create RDS Database with CDK

```typescript
// lib/database-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export class DatabaseStack extends cdk.Stack {
  public readonly dbInstance: rds.DatabaseInstance;
  public readonly dbSecret: secretsmanager.ISecret;
  public readonly vpc: ec2.IVpc;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create or import VPC
    this.vpc = new ec2.Vpc(this, 'StreamSalesVPC', {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
        {
          name: 'Database',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
    });

    // Security group for RDS
    const dbSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for Stream Sales RDS instance',
      allowAllOutbound: false,
    });

    // Create database credentials in Secrets Manager
    this.dbSecret = new secretsmanager.Secret(this, 'DatabaseCredentials', {
      secretName: 'stream-sales/database/credentials',
      description: 'Stream Sales PostgreSQL database credentials',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          username: 'dbadmin',
          engine: 'postgres',
          dbname: 'streams',
        }),
        generateStringKey: 'password',
        excludePunctuation: true,
        passwordLength: 32,
        excludeCharacters: '"@/\\',
      },
    });

    // Create RDS PostgreSQL instance
    this.dbInstance = new rds.DatabaseInstance(this, 'StreamSalesDatabase', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15_4,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.MICRO
      ),
      vpc: this.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      securityGroups: [dbSecurityGroup],
      databaseName: 'streams',
      credentials: rds.Credentials.fromSecret(this.dbSecret),
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      storageEncrypted: true,
      deletionProtection: true,
      backupRetention: cdk.Duration.days(7),
      preferredBackupWindow: '03:00-04:00',
      preferredMaintenanceWindow: 'sun:04:00-sun:05:00',
      multiAz: false, // Set to true for production HA
      autoMinorVersionUpgrade: true,
      publiclyAccessible: false,
      enablePerformanceInsights: true,
      performanceInsightRetention: rds.PerformanceInsightRetention.DEFAULT,
      removalPolicy: cdk.RemovalPolicy.SNAPSHOT,
    });

    // Update secret with RDS endpoint
    new cdk.CustomResource(this, 'UpdateSecretWithEndpoint', {
      serviceToken: this.createSecretUpdaterLambda().functionArn,
      properties: {
        SecretArn: this.dbSecret.secretArn,
        Host: this.dbInstance.dbInstanceEndpointAddress,
        Port: this.dbInstance.dbInstanceEndpointPort,
      },
    });

    // Outputs
    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: this.dbInstance.dbInstanceEndpointAddress,
      description: 'RDS database endpoint',
    });

    new cdk.CfnOutput(this, 'DatabaseSecretName', {
      value: this.dbSecret.secretName,
      description: 'Database credentials secret name',
    });
  }

  private createSecretUpdaterLambda() {
    // Lambda to update secret with RDS endpoint after creation
    // Implementation details omitted for brevity
    // This would be a custom resource that updates the secret JSON
    // to include the RDS endpoint after it's created
    throw new Error('Implement secret updater Lambda');
  }
}
```

## Step 2: Create RDS Proxy (Optional, Recommended)

RDS Proxy improves connection pooling for serverless applications:

```typescript
// lib/database-stack.ts (continued)

export class DatabaseStack extends cdk.Stack {
  public readonly dbProxy: rds.DatabaseProxy;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    // ... previous code ...

    // Create RDS Proxy
    this.dbProxy = new rds.DatabaseProxy(this, 'DatabaseProxy', {
      proxyTarget: rds.ProxyTarget.fromInstance(this.dbInstance),
      secrets: [this.dbSecret],
      vpc: this.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [dbSecurityGroup],
      requireTLS: true,
      maxConnectionsPercent: 100,
      maxIdleConnectionsPercent: 50,
      sessionPinningFilters: [
        rds.SessionPinningFilter.EXCLUDE_VARIABLE_SETS,
      ],
      debugLogging: false,
    });

    // Update secret to use proxy endpoint instead of direct RDS
    const proxySecret = new secretsmanager.Secret(this, 'ProxyDatabaseCredentials', {
      secretName: 'stream-sales/database/credentials',
      secretObjectValue: {
        host: cdk.SecretValue.unsafePlainText(this.dbProxy.endpoint),
        port: cdk.SecretValue.unsafePlainText('5432'),
        username: this.dbSecret.secretValueFromJson('username'),
        password: this.dbSecret.secretValueFromJson('password'),
        dbname: cdk.SecretValue.unsafePlainText('streams'),
        engine: cdk.SecretValue.unsafePlainText('postgres'),
      },
    });

    new cdk.CfnOutput(this, 'ProxyEndpoint', {
      value: this.dbProxy.endpoint,
      description: 'RDS Proxy endpoint',
    });
  }
}
```

## Step 3: Configure Lambda Function

```typescript
// lib/app-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { DatabaseStack } from './database-stack';

export class AppStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    databaseStack: DatabaseStack,
    props?: cdk.StackProps
  ) {
    super(scope, id, props);

    // Create Lambda function for Next.js
    const nextjsFunction = new lambda.Function(this, 'NextjsFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('.open-next/server-function'),
      vpc: databaseStack.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 1024,
      environment: {
        NODE_ENV: 'production',
        AWS_SECRET_NAME: databaseStack.dbSecret.secretName,
        AWS_REGION: this.region,
        // Add other environment variables
        JWT_SECRET: 'your-secret-from-another-secret',
        JWT_EXPIRES_IN: '7d',
      },
    });

    // Grant Lambda access to database secret
    databaseStack.dbSecret.grantRead(nextjsFunction);

    // Allow Lambda to connect to database
    if (databaseStack.dbProxy) {
      databaseStack.dbProxy.grantConnect(nextjsFunction);
    } else {
      databaseStack.dbInstance.connections.allowFrom(
        nextjsFunction,
        ec2.Port.tcp(5432),
        'Allow Lambda to connect to RDS'
      );
    }
  }
}
```

## Step 4: Deploy with CDK

```bash
# Install dependencies
npm install

# Bootstrap CDK (first time only)
cdk bootstrap aws://ACCOUNT_ID/REGION

# Synthesize CloudFormation template
cdk synth

# Deploy database stack
cdk deploy DatabaseStack

# Deploy application stack
cdk deploy AppStack

# Or deploy all stacks
cdk deploy --all
```

## Step 5: Run Database Migrations

After deployment, run Prisma migrations:

### Option A: Using AWS Systems Manager (SSM)

```bash
# Connect to ECS task or Lambda via SSM
aws ssm start-session --target <instance-id>

# Run migrations
cd /var/task
npx prisma migrate deploy
```

### Option B: Using Migration Lambda

Create a separate Lambda function for migrations:

```typescript
// lib/migration-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cr from 'aws-cdk-lib/custom-resources';

export class MigrationStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    databaseStack: DatabaseStack,
    props?: cdk.StackProps
  ) {
    super(scope, id, props);

    // Migration Lambda
    const migrationFunction = new lambda.Function(this, 'MigrationFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'migrate.handler',
      code: lambda.Code.fromAsset('dist/migration'),
      vpc: databaseStack.vpc,
      timeout: cdk.Duration.minutes(5),
      environment: {
        NODE_ENV: 'production',
        AWS_SECRET_NAME: databaseStack.dbSecret.secretName,
        AWS_REGION: this.region,
      },
    });

    databaseStack.dbSecret.grantRead(migrationFunction);

    // Run migration on deployment
    const migrationProvider = new cr.Provider(this, 'MigrationProvider', {
      onEventHandler: migrationFunction,
    });

    new cdk.CustomResource(this, 'RunMigration', {
      serviceToken: migrationProvider.serviceToken,
    });
  }
}
```

Migration handler (`migration/migrate.ts`):

```typescript
import { prisma, disconnectPrisma } from '../src/infrastructure/database/prisma';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function handler(event: any) {
  console.log('Running Prisma migrations...');

  try {
    // Run migrations using Prisma CLI
    const { stdout, stderr } = await execAsync('npx prisma migrate deploy');

    console.log('Migration output:', stdout);
    if (stderr) console.error('Migration errors:', stderr);

    await disconnectPrisma();

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Migrations completed successfully',
        output: stdout,
      }),
    };
  } catch (error) {
    console.error('Migration failed:', error);
    await disconnectPrisma();
    throw error;
  }
}
```

## Step 6: Monitoring and Logging

### CloudWatch Logs

View application logs:

```bash
aws logs tail /aws/lambda/stream-sales-nextjs --follow
```

Look for Prisma connection logs:

```
[Prisma] Production environment detected, using AWS Secrets Manager
[Prisma] Retrieving database credentials from AWS Secrets Manager: stream-sales/database/credentials
[Prisma] Successfully retrieved database credentials for stream-sales-db.abc123.us-east-1.rds.amazonaws.com:5432/streams
[Prisma] Initializing Prisma Client (attempt 1/3)
[Prisma] Database connection established successfully
```

### CloudWatch Alarms

Create alarms for database issues:

```typescript
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';

// Create SNS topic for alarms
const alarmTopic = new sns.Topic(this, 'DatabaseAlarms');

// Database connection alarm
new cloudwatch.Alarm(this, 'DatabaseConnectionAlarm', {
  metric: databaseStack.dbInstance.metricDatabaseConnections(),
  threshold: 80,
  evaluationPeriods: 2,
  comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
  treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
});

// Lambda error alarm
const lambdaErrors = nextjsFunction.metricErrors({
  period: cdk.Duration.minutes(5),
});

new cloudwatch.Alarm(this, 'LambdaErrorAlarm', {
  metric: lambdaErrors,
  threshold: 10,
  evaluationPeriods: 1,
  alarmDescription: 'Lambda function has high error rate',
});
```

## Testing

### Local Testing with Secrets Manager

```bash
# Install AWS CLI local
pip install awscli-local

# Create local secret
aws secretsmanager create-secret \
  --name stream-sales/database/credentials \
  --secret-string '{
    "host": "localhost",
    "port": "5432",
    "username": "postgres",
    "password": "password",
    "dbname": "streams",
    "engine": "postgres"
  }' \
  --endpoint-url http://localhost:4566

# Run application
NODE_ENV=production AWS_SECRET_NAME=stream-sales/database/credentials npm run dev
```

### Integration Tests

```typescript
// tests/integration/database.test.ts
import { prisma, disconnectPrisma } from '@/infrastructure/database/prisma';

describe('Database Integration Tests', () => {
  afterAll(async () => {
    await disconnectPrisma();
  });

  it('should connect to database', async () => {
    const result = await prisma.$queryRaw`SELECT 1 as value`;
    expect(result).toBeDefined();
  });

  it('should retrieve secret from AWS', async () => {
    // Mock AWS Secrets Manager for testing
    // Test secret retrieval logic
  });
});
```

## Security Best Practices

1. **Secrets Rotation**: Enable automatic rotation for RDS credentials
2. **IAM Authentication**: Consider using IAM database authentication
3. **VPC Configuration**: Ensure database is in private subnet
4. **Encryption**: Enable encryption at rest and in transit
5. **Least Privilege**: Grant minimal IAM permissions

### Enable Secrets Rotation

```typescript
this.dbSecret.addRotationSchedule('RotationSchedule', {
  automaticallyAfter: cdk.Duration.days(30),
  rotateImmediatelyOnUpdate: false,
});
```

## Troubleshooting

### Issue: "Failed to connect to database after 3 attempts"

1. Check security groups allow Lambda → RDS on port 5432
2. Verify Lambda is in VPC with route to database subnet
3. Check RDS instance is running
4. Validate secret contains correct credentials

### Issue: "Secret not found"

1. Verify `AWS_SECRET_NAME` environment variable is set
2. Check Lambda has permissions to read secret
3. Ensure secret exists in the same region

### Issue: Connection timeout

1. Increase Lambda timeout (default: 30s)
2. Check VPC NAT Gateway is working
3. Verify RDS security group rules
4. Consider using RDS Proxy

## Cost Optimization

1. **Use RDS Proxy**: Share connections across Lambda instances
2. **Right-size Instance**: Start with t3.micro, scale as needed
3. **Enable Auto Scaling**: For storage
4. **Use Reserved Instances**: For production databases
5. **Implement Connection Pooling**: Reduce connection overhead

## Next Steps

1. Set up automated backups
2. Configure CloudWatch dashboards
3. Implement database performance monitoring
4. Set up disaster recovery plan
5. Create runbooks for common issues

## Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [RDS Best Practices](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_BestPractices.html)
- [Prisma with AWS Lambda](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-aws-lambda)
- [Secrets Manager Rotation](https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotating-secrets.html)
