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
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as ecr from "aws-cdk-lib/aws-ecr";

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
  public readonly ecsCluster: ecs.Cluster;
  public readonly ecsService: ecs.FargateService;
  public readonly alb: elbv2.ApplicationLoadBalancer;
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
    // 5. COMPUTE - ECS Fargate with Application Load Balancer
    // ============================================

    // Security Group for ALB (public-facing)
    const albSecurityGroup = new ec2.SecurityGroup(this, "ALBSecurityGroup", {
      vpc: this.vpc,
      description: "Security group for Application Load Balancer",
      allowAllOutbound: true,
    });

    // Allow HTTP traffic from internet to ALB
    albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      "Allow HTTP traffic from internet"
    );

    // Allow HTTPS traffic from internet to ALB (for future SSL/TLS)
    albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      "Allow HTTPS traffic from internet"
    );

    // Security Group for ECS Tasks
    const ecsSecurityGroup = new ec2.SecurityGroup(this, "ECSSecurityGroup", {
      vpc: this.vpc,
      description: "Security group for ECS Fargate tasks",
      allowAllOutbound: true,
    });

    // Allow traffic from ALB to ECS tasks on port 3000 (Next.js default)
    ecsSecurityGroup.addIngressRule(
      albSecurityGroup,
      ec2.Port.tcp(3000),
      "Allow traffic from ALB to ECS tasks"
    );

    // Allow ECS tasks to connect to Aurora database
    dbSecurityGroup.addIngressRule(
      ecsSecurityGroup,
      ec2.Port.tcp(5432),
      "Allow ECS tasks to connect to Aurora cluster"
    );

    // ECS Cluster
    this.ecsCluster = new ecs.Cluster(this, "ECSCluster", {
      vpc: this.vpc,
      clusterName: `stream-sales-${env}-cluster`,
      containerInsights: isProd, // Enable Container Insights in production
    });

    // Reference existing ECR repository
    const ecrRepository = ecr.Repository.fromRepositoryArn(
      this,
      "ECRRepository",
      `arn:aws:ecr:us-east-1:336912793236:repository/stream-sales/nextjs`
    );

    // Task Definition
    const taskDefinition = new ecs.FargateTaskDefinition(this, "TaskDefinition", {
      memoryLimitMiB: 1024, // 1GB memory
      cpu: 512, // 0.5 vCPU
      family: `stream-sales-${env}-task`,
    });

    // Grant permissions to read secrets
    this.dbSecret.grantRead(taskDefinition.taskRole);
    jwtSecret.grantRead(taskDefinition.taskRole);
    encryptionSecret.grantRead(taskDefinition.taskRole);

    // Grant S3 permissions
    this.imagesBucket.grantReadWrite(taskDefinition.taskRole);

    // CloudWatch log group for ECS tasks
    const logGroup = new logs.LogGroup(this, "ECSLogGroup", {
      logGroupName: `/ecs/stream-sales-${env}`,
      retention: isProd ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.ONE_WEEK,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Container Definition
    const container = taskDefinition.addContainer("NextJsContainer", {
      containerName: "nextjs-app",
      image: ecs.ContainerImage.fromEcrRepository(ecrRepository, "dev"),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: "nextjs",
        logGroup: logGroup,
      }),
      environment: {
        // Environment
        NODE_ENV: "production",
        AWS_REGION: this.region,

        // Database - Secret ARNs (read at runtime)
        AWS_SECRET_NAME: `stream-sales/${env}/database/credentials`,
        DATABASE_HOST: this.dbCluster.clusterEndpoint.hostname,
        DATABASE_PORT: this.dbCluster.clusterEndpoint.port.toString(),
        DATABASE_NAME: "streams",

        // JWT Configuration
        JWT_EXPIRES_IN: "7d",

        // Storage
        IMAGES_BUCKET_NAME: this.imagesBucket.bucketName,
        IMAGES_BUCKET_REGION: this.region,
      },
      secrets: {
        // Secrets from AWS Secrets Manager
        JWT_SECRET: ecs.Secret.fromSecretsManager(jwtSecret),
        ENCRYPTION_KEY: ecs.Secret.fromSecretsManager(encryptionSecret),
      },
      healthCheck: {
        command: [
          "CMD-SHELL",
          "curl -f http://localhost:3000/api/health || exit 1",
        ],
        interval: Duration.seconds(30),
        timeout: Duration.seconds(5),
        retries: 3,
        startPeriod: Duration.seconds(60),
      },
    });

    // Expose port 3000 for the Next.js application
    container.addPortMappings({
      containerPort: 3000,
      protocol: ecs.Protocol.TCP,
    });

    // Application Load Balancer
    this.alb = new elbv2.ApplicationLoadBalancer(this, "ALB", {
      vpc: this.vpc,
      internetFacing: true,
      loadBalancerName: `stream-sales-${env}-alb`,
      securityGroup: albSecurityGroup,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC, // ALB in public subnets
      },
      deletionProtection: props?.deletionProtection ?? isProd,
    });

    // Target Group
    const targetGroup = new elbv2.ApplicationTargetGroup(this, "TargetGroup", {
      vpc: this.vpc,
      port: 3000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      healthCheck: {
        path: "/api/health",
        interval: Duration.seconds(30),
        timeout: Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
        healthyHttpCodes: "200",
      },
      deregistrationDelay: Duration.seconds(30),
    });

    // HTTP Listener
    this.alb.addListener("HTTPListener", {
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      defaultAction: elbv2.ListenerAction.forward([targetGroup]),
    });

    // ECS Fargate Service
    this.ecsService = new ecs.FargateService(this, "FargateService", {
      cluster: this.ecsCluster,
      taskDefinition: taskDefinition,
      desiredCount: 1, // 1 task for dev environment
      serviceName: `stream-sales-${env}-service`,
      assignPublicIp: false, // Tasks in private subnets
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, // ECS tasks in private subnets
      },
      securityGroups: [ecsSecurityGroup],
      healthCheckGracePeriod: Duration.seconds(60),
      minHealthyPercent: isProd ? 50 : 0, // Allow rolling updates
      maxHealthyPercent: 200,
    });

    // Attach service to target group
    this.ecsService.attachToApplicationTargetGroup(targetGroup);

    // Auto-scaling (optional, can be enabled later)
    const scaling = this.ecsService.autoScaleTaskCount({
      minCapacity: 1,
      maxCapacity: isProd ? 10 : 2,
    });

    // Scale based on CPU utilization
    scaling.scaleOnCpuUtilization("CpuScaling", {
      targetUtilizationPercent: 70,
      scaleInCooldown: Duration.seconds(60),
      scaleOutCooldown: Duration.seconds(60),
    });

    // Scale based on memory utilization
    scaling.scaleOnMemoryUtilization("MemoryScaling", {
      targetUtilizationPercent: 80,
      scaleInCooldown: Duration.seconds(60),
      scaleOutCooldown: Duration.seconds(60),
    });

    // CloudWatch Alarms for ECS Service
    if (props?.alarmEmail) {
      const alarmTopic = new sns.Topic(this, "ECSAlarmTopic", {
        displayName: `Stream Sales ${env} ECS Alarms`,
      });

      new sns.Subscription(this, "ECSAlarmEmailSubscription", {
        topic: alarmTopic,
        protocol: sns.SubscriptionProtocol.EMAIL,
        endpoint: props.alarmEmail,
      });

      // Service CPU alarm
      const ecsCpuAlarm = new cloudwatch.Alarm(this, "ECSCPUAlarm", {
        metric: this.ecsService.metricCpuUtilization(),
        threshold: 80,
        evaluationPeriods: 2,
        datapointsToAlarm: 2,
        alarmDescription: "ECS service CPU utilization is too high",
      });
      ecsCpuAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(alarmTopic));

      // Service memory alarm
      const ecsMemoryAlarm = new cloudwatch.Alarm(this, "ECSMemoryAlarm", {
        metric: this.ecsService.metricMemoryUtilization(),
        threshold: 80,
        evaluationPeriods: 2,
        datapointsToAlarm: 2,
        alarmDescription: "ECS service memory utilization is too high",
      });
      ecsMemoryAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(alarmTopic));

      // ALB target health alarm
      const albHealthAlarm = new cloudwatch.Alarm(this, "ALBHealthAlarm", {
        metric: targetGroup.metricHealthyHostCount(),
        threshold: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
        evaluationPeriods: 2,
        alarmDescription: "No healthy targets in ALB target group",
      });
      albHealthAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(alarmTopic));
    }

    // ============================================
    // 6. MIGRATIONS - Lambda for Prisma Migrations
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
    // 7. COMPUTE - OpenNext (Lambda + CloudFront)
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
    // 8. PERMISSIONS - IAM Policies
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
    // 9. MONITORING & LOGGING
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
    // 10. TAGS - Resource Tagging
    // ============================================
    Tags.of(this).add("Project", "StreamSales");
    Tags.of(this).add("Environment", env);
    Tags.of(this).add("ManagedBy", "CDK");
    Tags.of(this).add("CostCenter", "Engineering");

    // ============================================
    // 11. OUTPUTS - Stack Outputs
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

    // ECS and ALB outputs
    new CfnOutput(this, "ApplicationLoadBalancerURL", {
      value: `http://${this.alb.loadBalancerDnsName}`,
      description: "Application Load Balancer URL (HTTP)",
      exportName: `StreamSales-${env}-ALBURL`,
    });

    new CfnOutput(this, "ALBDNSName", {
      value: this.alb.loadBalancerDnsName,
      description: "ALB DNS name for CNAME configuration",
      exportName: `StreamSales-${env}-ALBDNSName`,
    });

    new CfnOutput(this, "ECSClusterName", {
      value: this.ecsCluster.clusterName,
      description: "ECS Cluster name",
      exportName: `StreamSales-${env}-ECSClusterName`,
    });

    new CfnOutput(this, "ECSServiceName", {
      value: this.ecsService.serviceName,
      description: "ECS Service name",
      exportName: `StreamSales-${env}-ECSServiceName`,
    });

    new CfnOutput(this, "ECSTaskDefinitionArn", {
      value: this.ecsService.taskDefinition.taskDefinitionArn,
      description: "ECS Task Definition ARN",
      exportName: `StreamSales-${env}-TaskDefinitionArn`,
    });

    // Database connection command for emergency access
    new CfnOutput(this, "DatabaseConnectCommand", {
      value: `aws secretsmanager get-secret-value --secret-id ${this.dbSecret.secretArn} --query SecretString --output text | jq -r '"postgresql://\\(.username):\\(.password)@${this.dbCluster.clusterEndpoint.hostname}:${this.dbCluster.clusterEndpoint.port}/streams"'`,
      description: "Command to get database connection string",
    });

    // ECS deployment command
    new CfnOutput(this, "ECSDeployCommand", {
      value: `aws ecs update-service --cluster ${this.ecsCluster.clusterName} --service ${this.ecsService.serviceName} --force-new-deployment --region ${this.region}`,
      description: "Command to force new ECS deployment",
    });
  }
}
