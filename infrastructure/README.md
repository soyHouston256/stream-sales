# Stream Sales - AWS CDK Infrastructure

Complete AWS infrastructure for the Stream Sales marketplace platform using AWS CDK.

## 🏗️ Architecture Overview

### Infrastructure Components

- **Compute**: AWS Lambda (via OpenNext) + CloudFront CDN
- **Database**: Aurora Serverless v2 PostgreSQL
- **Storage**: S3 bucket for product images
- **Networking**: VPC with public, private, and isolated subnets
- **Secrets**: AWS Secrets Manager for credentials
- **Monitoring**: CloudWatch Logs, Metrics, and Alarms
- **Security**: IAM roles, Security Groups, SSL/TLS encryption

### Environments

- **dev**: Development environment with minimal resources
- **staging**: Staging environment for pre-production testing
- **production**: Production environment with high availability and monitoring

## 📋 Prerequisites

1. **AWS CLI configured**:
   ```bash
   aws configure
   # Enter your AWS Access Key ID, Secret Access Key, and region
   ```

2. **Node.js 18+** installed

3. **AWS CDK CLI** installed globally:
   ```bash
   npm install -g aws-cdk
   ```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd cdk
npm install
```

### 2. Bootstrap CDK (First Time Only)

```bash
npm run bootstrap
```

This creates the necessary S3 bucket and IAM roles for CDK deployments.

### 3. Deploy to Development

```bash
# Review what will be created
npm run diff:dev

# Deploy
npm run deploy:dev
```

## 📦 Deployment Commands

### Development

```bash
# Synthesize CloudFormation template
npm run synth:dev

# Show differences
npm run diff:dev

# Deploy
npm run deploy:dev

# Destroy (clean up)
npm run destroy:dev
```

### Staging

```bash
npm run synth:staging
npm run diff:staging
npm run deploy:staging
```

### Production

```bash
# Production requires manual approval for security changes
npm run synth:prod
npm run diff:prod
npm run deploy:prod

# With alarm email
cdk deploy StreamSalesStack-production \
  --context environment=production \
  --context deletionProtection=true \
  --context alarmEmail=admin@example.com
```

## 🔧 Configuration

### Environment Variables

The stack uses these environment variables at build time:

```bash
# Required
CDK_DEFAULT_ACCOUNT=123456789012
CDK_DEFAULT_REGION=us-east-1

# Optional
AWS_PROFILE=my-profile
```

### Context Parameters

Pass configuration via CDK context:

```bash
cdk deploy \
  --context environment=production \
  --context deletionProtection=true \
  --context alarmEmail=admin@example.com
```

**Available context parameters**:
- `environment`: dev | staging | production (default: dev)
- `deletionProtection`: true | false (default: false for dev, true for prod)
- `alarmEmail`: Email for CloudWatch alarms

## 🗄️ Database Management

### Running Prisma Migrations

After deploying, get the database connection string:

```bash
# Get the database secret ARN from outputs
SECRET_ARN=$(aws cloudformation describe-stacks \
  --stack-name StreamSalesStack-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`DatabaseSecretArn`].OutputValue' \
  --output text)

# Get connection string
aws secretsmanager get-secret-value \
  --secret-id $SECRET_ARN \
  --query SecretString \
  --output text | jq -r '"postgresql://\(.username):\(.password)@\(.host):\(.port)/\(.dbname)?sslmode=require"'
```

Run migrations:

```bash
# Set the connection string
export DATABASE_URL="postgresql://..."

# Run migrations
npm run prisma:migrate deploy

# Or from root directory
cd ..
npm run prisma:migrate deploy
```

### Connecting to Database

```bash
# Using psql
psql $(aws secretsmanager get-secret-value \
  --secret-id $SECRET_ARN \
  --query SecretString \
  --output text | jq -r '"postgresql://\(.username):\(.password)@\(.host):\(.port)/\(.dbname)?sslmode=require"')
```

## 🔐 Secrets Management

The stack automatically creates these secrets:

1. **Database Credentials**: `stream-sales/{env}/database/credentials`
   ```json
   {
     "username": "dbadmin",
     "password": "auto-generated-32-char-password",
     "engine": "postgres",
     "host": "cluster-endpoint.rds.amazonaws.com",
     "port": "5432",
     "dbname": "streams"
   }
   ```

2. **JWT Secret**: `stream-sales/{env}/jwt/secret`
   - Auto-generated 64-character secure string

3. **Encryption Key**: `stream-sales/{env}/encryption/key`
   - Auto-generated 64-character secure string for product password encryption

### Accessing Secrets

```bash
# Database credentials
aws secretsmanager get-secret-value \
  --secret-id stream-sales/dev/database/credentials \
  --query SecretString --output text | jq

# JWT secret
aws secretsmanager get-secret-value \
  --secret-id stream-sales/dev/jwt/secret \
  --query SecretString --output text

# Encryption key
aws secretsmanager get-secret-value \
  --secret-id stream-sales/dev/encryption/key \
  --query SecretString --output text
```

## 📊 Stack Outputs

After deployment, these outputs are available:

| Output | Description |
|--------|-------------|
| `CloudFrontURL` | Application URL (https://...) |
| `DatabaseEndpoint` | Aurora cluster endpoint |
| `DatabaseSecretArn` | ARN of database credentials secret |
| `JWTSecretArn` | ARN of JWT secret |
| `ImagesBucketName` | S3 bucket name for images |
| `ImagesBucketURL` | S3 bucket website URL |
| `VPCId` | VPC identifier |
| `DatabaseConnectCommand` | Command to get DB connection string |

View outputs:

```bash
aws cloudformation describe-stacks \
  --stack-name StreamSalesStack-dev \
  --query 'Stacks[0].Outputs'
```

## 🔍 Monitoring

### CloudWatch Dashboards

Access CloudWatch dashboards for:
- Lambda function metrics
- Database performance
- API Gateway requests
- Error rates

### Alarms (Production Only)

When `alarmEmail` is configured:

1. **Database CPU Alarm**: Triggers when CPU > 80% for 2 periods
2. **Database Connections Alarm**: Triggers when connections > 90
3. **Lambda Error Alarm**: Triggers when errors > 10 in 2 periods

### Logs

```bash
# Lambda function logs
aws logs tail /aws/lambda/StreamSalesStack-dev-OpenNextStack... --follow

# Database logs (if enabled)
aws logs tail /aws/rds/cluster/stream-sales-dev-cluster/postgresql --follow
```

## 💰 Cost Optimization

### Development

- Aurora auto-pauses after 10 minutes of inactivity
- Minimal NAT Gateways (1 instead of 2)
- Shorter log retention (7 days)
- No enhanced monitoring
- Smaller database capacity (2-4 ACUs)

### Production

- No auto-pause for Aurora
- High availability with 3 AZs
- Longer log retention (30 days)
- Enhanced monitoring enabled
- Larger database capacity (4-16 ACUs)
- CloudWatch alarms

### Estimated Monthly Costs

| Environment | Estimated Cost |
|-------------|----------------|
| Dev (idle) | $15-30/month |
| Dev (active) | $50-100/month |
| Staging | $100-200/month |
| Production | $300-500/month |

*Costs vary based on usage, data transfer, and database capacity.*

## 🧪 Testing

### Test the Deployed Stack

```bash
# Get CloudFront URL
CLOUDFRONT_URL=$(aws cloudformation describe-stacks \
  --stack-name StreamSalesStack-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontURL`].OutputValue' \
  --output text)

# Test the application
curl $CLOUDFRONT_URL

# Test API endpoint
curl $CLOUDFRONT_URL/api/health
```

### Test Database Connection

```bash
# From the app directory
cd ..
NODE_ENV=production \
AWS_SECRET_NAME=stream-sales/dev/database/credentials \
npm run test:db
```

## 🔄 Updating Infrastructure

### Updating the Stack

```bash
# 1. Make changes to lib/infra-stack.ts

# 2. See what will change
npm run diff:dev

# 3. Deploy changes
npm run deploy:dev
```

### Updating Dependencies

```bash
# Update CDK
npm install -g aws-cdk@latest

# Update project dependencies
npm update

# Check for outdated packages
npm outdated
```

## 🗑️ Cleanup

### Destroy Development Stack

```bash
# This will delete all resources
npm run destroy:dev

# Or manually
cdk destroy StreamSalesStack-dev
```

### Destroy Production Stack

```bash
# Production has deletion protection and snapshots
# You may need to manually delete some resources first

# 1. Disable deletion protection
aws rds modify-db-cluster \
  --db-cluster-identifier stream-sales-production-cluster \
  --no-deletion-protection

# 2. Destroy stack
cdk destroy StreamSalesStack-production
```

## 🛠️ Troubleshooting

### Common Issues

**Issue**: CDK not bootstrapped
```bash
Error: This stack uses assets, so the toolkit stack must be deployed
```
**Solution**: Run `npm run bootstrap`

---

**Issue**: Database connection timeout
```bash
Error: Timeout connecting to database
```
**Solution**:
1. Check Lambda is in VPC
2. Check Security Group allows traffic
3. Check database is not auto-paused (dev)

---

**Issue**: Secret not found
```bash
Error: Secrets Manager can't find the specified secret
```
**Solution**: Wait a few minutes after deployment for secrets to propagate

---

**Issue**: Build fails
```bash
Error: Prisma generate failed
```
**Solution**: Ensure DATABASE_URL is set in buildEnvironment

### Debug Mode

```bash
# Enable CDK debug logging
npm run deploy:dev -- --verbose

# Check CloudFormation events
aws cloudformation describe-stack-events \
  --stack-name StreamSalesStack-dev \
  --max-items 20
```

## 📚 Additional Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [OpenNext Documentation](https://open-next.js.org/)
- [Aurora Serverless v2 Guide](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.html)
- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)

## 🤝 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review CloudFormation stack events
3. Check CloudWatch logs
4. Review the code in `lib/infra-stack.ts`

## 📝 License

MIT
