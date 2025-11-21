#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { MvpStack } from '../lib/mvp-stack';

/**
 * MVP Deployment App
 *
 * This creates a cost-optimized infrastructure for Stream Sales MVP
 * using RDS free tier and OpenNext serverless deployment.
 */

const app = new cdk.App();

// Get environment from context or default to 'dev'
const env = app.node.tryGetContext('environment') || 'dev';
const alarmEmail = app.node.tryGetContext('alarmEmail');
const useFreeTier = app.node.tryGetContext('useFreeTier') !== 'false'; // Default to true

// AWS Account and Region from environment variables or CDK defaults
const account = process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID;
const region = process.env.CDK_DEFAULT_REGION || process.env.AWS_REGION || 'us-east-1';

if (!account) {
  console.error('❌ Error: AWS account ID not found.');
  console.error('Set CDK_DEFAULT_ACCOUNT or AWS_ACCOUNT_ID environment variable.');
  process.exit(1);
}

console.log('🚀 Deploying Stream Sales MVP Stack');
console.log(`📍 Environment: ${env}`);
console.log(`💰 Free Tier: ${useFreeTier ? 'Yes' : 'No'}`);
console.log(`🌎 Region: ${region}`);
console.log(`👤 Account: ${account}`);

new MvpStack(app, `StreamSalesMvp-${env}`, {
  env: {
    account,
    region,
  },
  environment: env,
  alarmEmail,
  useFreeTier,
  description: `Stream Sales MVP Infrastructure (${env}) - Cost optimized with RDS free tier`,
  tags: {
    Project: 'StreamSales',
    Environment: env,
    ManagedBy: 'CDK',
    CostOptimization: 'FreeTier',
  },
});

app.synth();
