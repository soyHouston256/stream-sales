import {
  Stack,
  StackProps,
  CfnOutput,
  RemovalPolicy,
  Duration,
  Tags,
} from "aws-cdk-lib";
import { Construct } from "constructs";
// import { OpenNextStack } from "open-next/constructs"; // TODO: Fix OpenNext integration
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as sns from "aws-cdk-lib/aws-sns";
import * as cloudwatch_actions from "aws-cdk-lib/aws-cloudwatch-actions";
import * as lambda from "aws-cdk-lib/aws-lambda";

interface InfraStackProps extends StackProps {
  /**
   * Environment name (dev, staging, production)
   */
  environment?: string;
  /**
   * Whether to enable deletion protection on critical resources
   */
  deletionProtection?: boolean;
  /**
   * Database scaling configuration
   */
  dbScaling?: {
    minCapacity?: rds.AuroraCapacityUnit;
    maxCapacity?: rds.AuroraCapacityUnit;
  };
  /**
   * Alarm email for critical notifications
   */
  alarmEmail?: string;
}

export class InfraStack extends Stack {
  public readonly vpc: ec2.IVpc;
  public readonly dbCluster: rds.DatabaseCluster;
  public readonly dbSecret: secretsmanager.ISecret;
  public readonly imagesBucket: s3.Bucket;
  // public readonly openNextStack: OpenNextStack; // TODO: Fix OpenNext integration

  constructor(scope: Construct, id: string, props?: InfraStackProps) {
    super(scope, id, props);

    const env = props?.environment || "dev";
    const isDev = env === "dev";
    const isProd = env === "production";

    // ============================================
    // 1. NETWORKING - VPC
    // ============================================
    this.vpc = new ec2.Vpc(this, "VPC", {
      maxAzs: isProd ? 3 : 2, // 3 AZs for production, 2 for dev
      natGateways: isProd ? 2 : 1, // High availability for prod
      subnetConfiguration: [
        {
          name: "Public",
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: "Private",
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
        {
          name: "Isolated",
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
      enableDnsHostnames: true,
      enableDnsSupport: true,
    });

    // VPC Flow Logs for security auditing (production only)
    if (isProd) {
      const logGroup = new logs.LogGroup(this, "VPCFlowLogsGroup", {
        retention: logs.RetentionDays.ONE_MONTH,
        removalPolicy: RemovalPolicy.DESTROY,
      });

      new ec2.FlowLog(this, "VPCFlowLog", {
        resourceType: ec2.FlowLogResourceType.fromVpc(this.vpc),
        destination: ec2.FlowLogDestination.toCloudWatchLogs(logGroup),
      });
    }

    // ============================================
    // 2. SECRETS MANAGEMENT
    // ============================================

    // Database credentials secret
    this.dbSecret = new secretsmanager.Secret(this, "DatabaseSecret", {
      secretName: `stream-sales/${env}/database/credentials`,
      description: `Database credentials for Stream Sales ${env} environment`,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          username: "dbadmin",
          engine: "postgres",
          dbname: "streams",
        }),
        generateStringKey: "password",
        excludePunctuation: true,
        includeSpace: false,
        passwordLength: 32,
      },
      removalPolicy: isDev ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN,
    });

    // JWT Secret (separate from DB credentials)
    const jwtSecret = new secretsmanager.Secret(this, "JWTSecret", {
      secretName: `stream-sales/${env}/jwt/secret`,
      description: `JWT secret for Stream Sales ${env} environment`,
      generateSecretString: {
        excludePunctuation: true,
        includeSpace: false,
        passwordLength: 64,
      },
      removalPolicy: isDev ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN,
    });

    // Encryption key secret (for product passwords)
    const encryptionSecret = new secretsmanager.Secret(this, "EncryptionSecret", {
      secretName: `stream-sales/${env}/encryption/key`,
      description: `Encryption key for Stream Sales ${env} environment`,
      generateSecretString: {
        excludePunctuation: true,
        includeSpace: false,
        passwordLength: 64,
      },
      removalPolicy: isDev ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN,
    });

    // ============================================
    // 3. DATABASE - Aurora Serverless v2
    // ============================================

    // Security Group for Database
    const dbSecurityGroup = new ec2.SecurityGroup(this, "DatabaseSecurityGroup", {
      vpc: this.vpc,
      description: "Security group for Aurora PostgreSQL cluster",
      allowAllOutbound: false, // Restrict outbound for security
    });

    // Database cluster - Aurora Serverless v2
    this.dbCluster = new rds.DatabaseCluster(this, "DatabaseCluster", {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_15_7, // Latest stable version available
      }),
      vpc: this.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED, // Most secure subnet
      },
      securityGroups: [dbSecurityGroup],
      credentials: rds.Credentials.fromSecret(this.dbSecret),
      defaultDatabaseName: "streams",
      writer: rds.ClusterInstance.serverlessV2("writer"),
      serverlessV2MinCapacity: 0.5, // Minimum ACUs (0.5-128)
      serverlessV2MaxCapacity: isProd ? 8 : 4, // Maximum ACUs
      backup: {
        retention: isProd ? Duration.days(30) : Duration.days(7),
      },
      deletionProtection: props?.deletionProtection ?? isProd,
      removalPolicy: isDev ? RemovalPolicy.DESTROY : RemovalPolicy.SNAPSHOT,
      clusterIdentifier: `stream-sales-${env}-cluster`,
    });

    // Enable enhanced monitoring (production only)
    if (isProd) {
      const monitoringRole = new iam.Role(this, "RDSMonitoringRole", {
        assumedBy: new iam.ServicePrincipal("monitoring.rds.amazonaws.com"),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            "service-role/AmazonRDSEnhancedMonitoringRole"
          ),
        ],
      });
    }

    // CloudWatch Alarms for Database
    if (props?.alarmEmail) {
      const alarmTopic = new sns.Topic(this, "DatabaseAlarmTopic", {
        displayName: `Stream Sales ${env} Database Alarms`,
      });

      new sns.Subscription(this, "AlarmEmailSubscription", {
        topic: alarmTopic,
        protocol: sns.SubscriptionProtocol.EMAIL,
        endpoint: props.alarmEmail,
      });

      // CPU Utilization Alarm - using custom metric
      const cpuAlarm = new cloudwatch.Alarm(this, "DatabaseCPUAlarm", {
        metric: new cloudwatch.Metric({
          namespace: 'AWS/RDS',
          metricName: 'CPUUtilization',
          dimensionsMap: {
            DBClusterIdentifier: this.dbCluster.clusterIdentifier,
          },
          statistic: 'Average',
          period: Duration.minutes(5),
        }),
        threshold: 80,
        evaluationPeriods: 2,
        datapointsToAlarm: 2,
        alarmDescription: "Database CPU utilization is too high",
      });
      cpuAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(alarmTopic));

      // Database Connections Alarm - using custom metric
      const connectionsAlarm = new cloudwatch.Alarm(this, "DatabaseConnectionsAlarm", {
        metric: new cloudwatch.Metric({
          namespace: 'AWS/RDS',
          metricName: 'DatabaseConnections',
          dimensionsMap: {
            DBClusterIdentifier: this.dbCluster.clusterIdentifier,
          },
          statistic: 'Average',
          period: Duration.minutes(5),
        }),
        threshold: 90,
        evaluationPeriods: 2,
        alarmDescription: "Too many database connections",
      });
      connectionsAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(alarmTopic));
    }

    // Construct database URL for Prisma build
    const prismaDbUrl = `postgresql://${this.dbSecret
      .secretValueFromJson("username")
      .unsafeUnwrap()}:${this.dbSecret
      .secretValueFromJson("password")
      .unsafeUnwrap()}@${this.dbCluster.clusterEndpoint.hostname}:${this.dbCluster.clusterEndpoint.port.toString()}/streams?sslmode=require&connection_limit=5&pool_timeout=20`;

    // ============================================
    // 4. STORAGE - S3 Bucket for Images
    // ============================================
    this.imagesBucket = new s3.Bucket(this, "ImagesBucket", {
      bucketName: `stream-sales-${env}-images-${this.account}`,
      // Security settings
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: false,
        ignorePublicAcls: false,
        blockPublicPolicy: false,
        restrictPublicBuckets: false,
      }),
      publicReadAccess: true,
      encryption: s3.BucketEncryption.S3_MANAGED, // Server-side encryption
      enforceSSL: true, // Require SSL/TLS
      versioned: isProd, // Enable versioning in production
      // CORS configuration
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.POST,
            s3.HttpMethods.DELETE,
          ],
          allowedOrigins: isDev ? ["*"] : ["https://*"], // Restrict in production
          allowedHeaders: ["*"],
          maxAge: 3000,
        },
      ],
      // Lifecycle rules
      lifecycleRules: [
        {
          id: "DeleteOldVersions",
          enabled: isProd,
          noncurrentVersionExpiration: Duration.days(30),
        },
        {
          id: "TransitionToInfrequentAccess",
          enabled: isProd,
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: Duration.days(90),
            },
          ],
        },
      ],
      removalPolicy: isDev ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN,
      autoDeleteObjects: isDev,
    });

    // ============================================
    // 5. MIGRATIONS - Lambda for Prisma Migrations
    // ============================================

    // Migration Lambda function
    const migrationLambda = new lambda.Function(this, "MigrationLambda", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset("../lambda-migrations"),
      timeout: Duration.minutes(5),
      memorySize: 1024,
      vpc: this.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      environment: {
        DATABASE_SECRET_ARN: this.dbSecret.secretArn,
        DATABASE_HOST: this.dbCluster.clusterEndpoint.hostname,
        DATABASE_PORT: this.dbCluster.clusterEndpoint.port.toString(),
        DATABASE_NAME: "streams",
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // Allow Lambda to connect to database
    this.dbCluster.connections.allowDefaultPortFrom(
      migrationLambda,
      "Allow migration Lambda to connect to Aurora cluster"
    );

    // Grant read access to database secret
    this.dbSecret.grantRead(migrationLambda);

    // ============================================
    // 6. COMPUTE - OpenNext (Lambda + CloudFront)
    // ============================================
    // TODO: Fix OpenNext integration - temporarily commented out
    /*
    this.openNextStack = new OpenNextStack(this, "OpenNextStack", {
      appPath: "..",
      // Build-time environment variables (for Prisma generation)
      buildEnvironment: {
        DATABASE_URL: prismaDbUrl,
        NODE_ENV: env,
      },
      // Runtime environment variables
      environment: {
        // Environment
        NODE_ENV: env,

        // Database - Reference secrets at runtime
        DATABASE_SECRET_ARN: this.dbSecret.secretArn,
        AWS_SECRET_NAME: `stream-sales/${env}/database/credentials`,
        AWS_REGION: this.region,

        // Database connection details (for emergency direct connection)
        DATABASE_HOST: this.dbCluster.clusterEndpoint.hostname,
        DATABASE_PORT: this.dbCluster.clusterEndpoint.port.toString(),
        DATABASE_NAME: "streams",

        // JWT
        JWT_SECRET_ARN: jwtSecret.secretArn,
        JWT_EXPIRES_IN: "7d",

        // Encryption
        ENCRYPTION_SECRET_ARN: encryptionSecret.secretArn,

        // Storage
        IMAGES_BUCKET_NAME: this.imagesBucket.bucketName,
        IMAGES_BUCKET_REGION: this.region,

        // Feature flags
        ENABLE_API_LOGGING: isProd ? "false" : "true",
        ENABLE_QUERY_LOGGING: isDev ? "true" : "false",
      },
    });
    */

    // ============================================
    // 6. PERMISSIONS - IAM Policies
    // ============================================
    // TODO: Uncomment when OpenNext is integrated
    /*
    // Grant database access
    this.dbSecret.grantRead(this.openNextStack.functions.default);
    jwtSecret.grantRead(this.openNextStack.functions.default);
    encryptionSecret.grantRead(this.openNextStack.functions.default);

    // Allow Lambda to connect to database
    this.dbCluster.connections.allowDefaultPortFrom(
      this.openNextStack.functions.default,
      "Allow Lambda to connect to Aurora cluster"
    );

    // Grant S3 permissions
    this.imagesBucket.grantReadWrite(this.openNextStack.functions.default);

    // Grant CloudWatch Logs permissions
    this.openNextStack.functions.default.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ],
        resources: ["*"],
      })
    );

    // Grant VPC network interface permissions (if using VPC)
    this.openNextStack.functions.default.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "ec2:CreateNetworkInterface",
          "ec2:DescribeNetworkInterfaces",
          "ec2:DeleteNetworkInterface",
        ],
        resources: ["*"],
      })
    );
    */

    // ============================================
    // 7. MONITORING & LOGGING
    // ============================================
    // TODO: Uncomment when OpenNext is integrated
    /*
    // Lambda Log Group with retention
    new logs.LogGroup(this, "LambdaLogGroup", {
      logGroupName: `/aws/lambda/${this.openNextStack.functions.default.functionName}`,
      retention: isProd ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.ONE_WEEK,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Lambda Error Alarm
    if (props?.alarmEmail) {
      const alarmTopic = sns.Topic.fromTopicArn(
        this,
        "LambdaAlarmTopic",
        `arn:aws:sns:${this.region}:${this.account}:DatabaseAlarmTopic`
      );

      const errorAlarm = new cloudwatch.Alarm(this, "LambdaErrorAlarm", {
        metric: this.openNextStack.functions.default.metricErrors(),
        threshold: 10,
        evaluationPeriods: 2,
        alarmDescription: "Lambda function error rate is too high",
      });
      errorAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(alarmTopic));
    }
    */

    // ============================================
    // 8. TAGS - Resource Tagging
    // ============================================
    Tags.of(this).add("Project", "StreamSales");
    Tags.of(this).add("Environment", env);
    Tags.of(this).add("ManagedBy", "CDK");
    Tags.of(this).add("CostCenter", "Engineering");

    // ============================================
    // 9. OUTPUTS - Stack Outputs
    // ============================================
    // TODO: Uncomment when OpenNext is integrated
    /*
    new CfnOutput(this, "CloudFrontURL", {
      value: `https://${this.openNextStack.distribution.distributionDomainName}`,
      description: "CloudFront distribution URL",
      exportName: `StreamSales-${env}-CloudFrontURL`,
    });
    */

    new CfnOutput(this, "DatabaseEndpoint", {
      value: this.dbCluster.clusterEndpoint.hostname,
      description: "Aurora cluster endpoint",
      exportName: `StreamSales-${env}-DatabaseEndpoint`,
    });

    new CfnOutput(this, "DatabaseSecretArn", {
      value: this.dbSecret.secretArn,
      description: "ARN of the database credentials secret",
      exportName: `StreamSales-${env}-DatabaseSecretArn`,
    });

    new CfnOutput(this, "JWTSecretArn", {
      value: jwtSecret.secretArn,
      description: "ARN of the JWT secret",
      exportName: `StreamSales-${env}-JWTSecretArn`,
    });

    new CfnOutput(this, "ImagesBucketName", {
      value: this.imagesBucket.bucketName,
      description: "S3 bucket for product images",
      exportName: `StreamSales-${env}-ImagesBucketName`,
    });

    new CfnOutput(this, "ImagesBucketURL", {
      value: this.imagesBucket.bucketWebsiteUrl,
      description: "S3 bucket website URL",
      exportName: `StreamSales-${env}-ImagesBucketURL`,
    });

    new CfnOutput(this, "VPCId", {
      value: this.vpc.vpcId,
      description: "VPC ID",
      exportName: `StreamSales-${env}-VPCId`,
    });

    // Database connection command for emergency access
    new CfnOutput(this, "DatabaseConnectCommand", {
      value: `aws secretsmanager get-secret-value --secret-id ${this.dbSecret.secretArn} --query SecretString --output text | jq -r '"postgresql://\\(.username):\\(.password)@${this.dbCluster.clusterEndpoint.hostname}:${this.dbCluster.clusterEndpoint.port}/streams"'`,
      description: "Command to get database connection string",
    });
  }
}
