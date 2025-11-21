import type { OpenNextConfig } from 'open-next/types';

/**
 * OpenNext Configuration for Stream Sales
 *
 * This configuration optimizes the Next.js application for AWS Lambda deployment
 * with CloudFront distribution.
 *
 * IMPORTANT: Install OpenNext first:
 * npm install --save-dev open-next@latest
 */

const config: OpenNextConfig = {
  // Build configuration
  build: {
    // Use standalone output for smaller Lambda packages
    // This requires "output: 'standalone'" in next.config.js
    standalone: true,

    // Minify Lambda functions for faster cold starts
    minify: true,

    // External packages to exclude from bundling
    external: [
      '@aws-sdk/client-secrets-manager',
      '@aws-sdk/client-s3',
      '@prisma/client',
      '.prisma/client',
    ],
  },

  // Lambda function configuration
  lambda: {
    // Server function (handles SSR and API routes)
    server: {
      // Memory configuration (start small, increase if needed)
      // 512MB is good for MVP, can increase to 1024MB if needed
      memorySize: 512,

      // Timeout in seconds (max 30s for API Gateway)
      timeout: 30,

      // Environment variables
      environment: {
        NODE_ENV: 'production',
        // AWS_REGION is set by CDK
        // DATABASE_URL is constructed at runtime from Secrets Manager
      },

      // Runtime
      runtime: 'nodejs18.x',

      // Architecture (arm64 is cheaper than x86_64)
      architecture: 'arm64',

      // VPC configuration (set by CDK)
      // vpc: {
      //   securityGroupIds: [],
      //   subnetIds: [],
      // },
    },

    // Image optimization function (if using next/image)
    imageOptimization: {
      memorySize: 512,
      timeout: 30,
      runtime: 'nodejs18.x',
      architecture: 'arm64',
    },

    // Warmer function (optional - keeps Lambda warm, costs extra)
    // Uncomment if cold starts are a problem
    // warmer: {
    //   schedule: 'rate(5 minutes)',
    //   concurrency: 1,
    // },
  },

  // CloudFront configuration
  cloudFront: {
    // Price class (100 = US, Canada, Europe only - cheapest)
    priceClass: 'PriceClass_100',

    // Cache behavior for static assets
    staticCaching: {
      // Cache static assets for 1 year
      maxAge: 31536000,

      // Allow CloudFront to cache even if origin doesn't send Cache-Control
      defaultTtl: 86400,
    },

    // Cache behavior for API routes
    apiCaching: {
      // No caching for API routes
      maxAge: 0,
      defaultTtl: 0,
    },

    // Custom error responses
    errorPages: [
      {
        errorCode: 404,
        responsePagePath: '/404',
        responseCode: 404,
      },
      {
        errorCode: 500,
        responsePagePath: '/500',
        responseCode: 500,
      },
    ],
  },

  // S3 configuration for static assets
  s3: {
    // Enable versioning for rollback capability
    versioning: false, // Disable for MVP to save costs

    // Lifecycle rules
    lifecycleRules: [
      {
        id: 'DeleteOldVersions',
        status: 'Enabled',
        noncurrentVersionExpiration: {
          noncurrentDays: 30,
        },
      },
    ],
  },

  // Dangerous options (use with caution)
  dangerous: {
    // Disable middleware if not used (faster cold starts)
    disableMiddleware: false,

    // Disable incremental static regeneration (ISR)
    disableISR: true, // MVP doesn't use ISR

    // Skip node_modules bundling for faster builds
    skipNodeModulesBundling: false,

    // Custom wrapper for Lambda handler (for debugging, monitoring, etc.)
    // wrapper: './lambda-wrapper.js',
  },

  // Debug configuration
  debug: {
    // Enable verbose logging during build
    verbose: false,

    // Print bundle sizes
    printBundleSizes: true,

    // Generate sourcemaps (larger Lambda packages)
    sourcemaps: false, // Disable for production
  },
};

export default config;
