import { Stack, StackProps, CfnOutput, RemovalPolicy } from "aws-cdk-lib";
import { Construct } from "constructs";
import { OpenNextStack } from "open-next/constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as s3 from "aws-cdk-lib/aws-s3";
import { BlockPublicAccess } from "aws-cdk-lib/aws-s3";

export class InfraStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // 1. Create a VPC for our database to live in
    const vpc = new ec2.Vpc(this, "VPC", {
      maxAzs: 2, // Use 2 Availability Zones for high availability
    });

    // 2. Create a secret for the database credentials
    const dbSecret = new secretsmanager.Secret(this, "DatabaseSecret", {
      secretName: "stream-sales/db-credentials",
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: "postgres" }),
        generateStringKey: "password",
        excludePunctuation: true,
        includeSpace: false,
      },
    });

    // 3. Create the Aurora Serverless v2 database cluster
    const dbCluster = new rds.ServerlessCluster(this, "DatabaseCluster", {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_15_3,
      }),
      vpc,
      credentials: rds.Credentials.fromSecret(dbSecret), // Use the secret we created
      defaultDatabaseName: "streamsales",
      scaling: {
        minCapacity: rds.AuroraCapacityUnit.ACU_2,
        maxCapacity: rds.AuroraCapacityUnit.ACU_4,
      },
    });

    // This connection string is needed for Prisma to build correctly within OpenNext
    const prismaDbUrl = `postgresql://${dbSecret
      .secretStringValueFromJson("username")
      .unsafeUnwrap()}:${dbSecret
      .secretStringValueFromJson("password")
      .unsafeUnwrap()}@${
      dbCluster.clusterEndpoint.hostname
    }:${dbCluster.clusterEndpoint.port.toString()}/streamsales?sslmode=require`;

    // 4. Create an S3 bucket for image uploads
    const imagesBucket = new s3.Bucket(this, "ImagesBucket", {
      blockPublicAccess: new BlockPublicAccess({
        blockPublicAcls: false,
        ignorePublicAcls: false,
        blockPublicPolicy: false,
        restrictPublicBuckets: false,
      }),
      publicReadAccess: true,
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.PUT,
            s3.HttpMethods.POST,
            s3.HttpMethods.GET,
          ],
          allowedOrigins: ["*"], // TODO: Restrict to CloudFront domain in production
          allowedHeaders: ["*"],
        },
      ],
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // 5. Create the OpenNext application stack
    const openNextStack = new OpenNextStack(this, "OpenNextStack", {
      appPath: "..",
      buildEnvironment: {
        DATABASE_URL: prismaDbUrl,
      },
      environment: {
        DATABASE_SECRET_ARN: dbSecret.secretArn,
        DATABASE_HOST: dbCluster.clusterEndpoint.hostname,
        DATABASE_PORT: dbCluster.clusterEndpoint.port.toString(),
        DATABASE_NAME: "streamsales",
        IMAGES_BUCKET_NAME: imagesBucket.bucketName,
      },
    });

    // 6. Grant database permissions
    dbSecret.grantRead(openNextStack.functions.default);
    dbCluster.connections.allowDefaultPortFrom(
      openNextStack.functions.default,
      "Allow Lambda to connect to the database"
    );

    // 7. Grant S3 upload permissions to the Lambda function
    imagesBucket.grantPut(openNextStack.functions.default);
    imagesBucket.grantRead(openNextStack.functions.default);

    // 8. Outputs for easy access
    new CfnOutput(this, "CloudFrontURL", {
      value: openNextStack.distribution.url,
    });
    new CfnOutput(this, "DatabaseSecretArn", {
      value: dbSecret.secretArn,
    });
    new CfnOutput(this, "ImagesBucketName", {
      value: imagesBucket.bucketName,
    });
  }
}
