#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { InfraStack } from "../lib/infra-stack";

const app = new cdk.App();

// Get environment from context or default to dev
const environment = app.node.tryGetContext("environment") || "dev";
const deletionProtection = app.node.tryGetContext("deletionProtection") === "true";
const alarmEmail = app.node.tryGetContext("alarmEmail");

// Environment-specific configurations
const environmentConfigs = {
  dev: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || "us-east-1",
    dbScaling: {
      minCapacity: 2,
      maxCapacity: 4,
    },
  },
  staging: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || "us-east-1",
    dbScaling: {
      minCapacity: 2,
      maxCapacity: 8,
    },
  },
  production: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || "us-east-1",
    dbScaling: {
      minCapacity: 4,
      maxCapacity: 16,
    },
  },
};

type Environment = keyof typeof environmentConfigs;
const config = environmentConfigs[environment as Environment] || environmentConfigs.dev;

// Create the stack
new InfraStack(app, `StreamSalesStack-${environment}`, {
  env: {
    account: config.account,
    region: config.region,
  },
  environment,
  deletionProtection,
  dbScaling: config.dbScaling,
  alarmEmail,
  description: `Stream Sales infrastructure for ${environment} environment`,
  tags: {
    Project: "StreamSales",
    Environment: environment,
    ManagedBy: "CDK",
  },
});

app.synth();
