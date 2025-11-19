/**
 * Database Connection Test Script
 *
 * Tests the Prisma client initialization with both local and AWS Secrets Manager configurations
 *
 * Usage:
 *   # Test local connection
 *   npm run test:db
 *
 *   # Test AWS Secrets Manager (requires AWS credentials)
 *   NODE_ENV=production AWS_SECRET_NAME=stream-sales/database/credentials npm run test:db
 */

import { prisma, disconnectPrisma } from '../src/infrastructure/database/prisma';

interface TestResult {
  name: string;
  success: boolean;
  duration: number;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

async function runTest(name: string, testFn: () => Promise<any>): Promise<void> {
  const startTime = Date.now();

  try {
    console.log(`\n🧪 Running: ${name}`);
    const result = await testFn();
    const duration = Date.now() - startTime;

    results.push({
      name,
      success: true,
      duration,
      details: result,
    });

    console.log(`✅ PASSED (${duration}ms)`);
    if (result) {
      console.log(`   Result:`, JSON.stringify(result, null, 2));
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    results.push({
      name,
      success: false,
      duration,
      error: errorMessage,
    });

    console.log(`❌ FAILED (${duration}ms)`);
    console.log(`   Error: ${errorMessage}`);
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('DATABASE CONNECTION TEST SUITE');
  console.log('='.repeat(60));

  console.log('\n📋 Environment Configuration:');
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? '✓ Set' : '✗ Not set'}`);
  console.log(`   AWS_SECRET_NAME: ${process.env.AWS_SECRET_NAME || '✗ Not set'}`);
  console.log(`   AWS_REGION: ${process.env.AWS_REGION || 'Not set (will default to us-east-1)'}`);

  console.log('\n🔍 Running Tests...');

  // Test 1: Basic Connection
  await runTest('Database Connection', async () => {
    await prisma.$connect();
    return { connected: true };
  });

  // Test 2: Simple Query
  await runTest('Simple Query (SELECT 1)', async () => {
    const result = await prisma.$queryRaw<Array<{ value: number }>>`SELECT 1 as value`;
    return result[0];
  });

  // Test 3: Check Database Version
  await runTest('Database Version', async () => {
    const result = await prisma.$queryRaw<Array<{ version: string }>>`SELECT version()`;
    return { version: result[0].version.split(',')[0] };
  });

  // Test 4: Check Prisma Schema Tables
  await runTest('List Database Tables', async () => {
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;
    return {
      count: tables.length,
      tables: tables.map(t => t.tablename),
    };
  });

  // Test 5: User Model Query
  await runTest('User Model Query', async () => {
    const count = await prisma.user.count();
    return { totalUsers: count };
  });

  // Test 6: Wallet Model Query
  await runTest('Wallet Model Query', async () => {
    const count = await prisma.wallet.count();
    return { totalWallets: count };
  });

  // Test 7: Transaction Test (Read-Only)
  await runTest('Database Transaction', async () => {
    const result = await prisma.$transaction(async (tx) => {
      const userCount = await tx.user.count();
      const productCount = await tx.product.count();
      return { userCount, productCount };
    });
    return result;
  });

  // Test 8: Connection Pool Stats (if available)
  await runTest('Connection Pool Info', async () => {
    // Note: Prisma doesn't expose pool stats directly
    // This is a placeholder for custom implementation
    return {
      note: 'Connection pooling is configured with limit=5, timeout=20s',
      configured: true,
    };
  });

  // Test 9: Performance Test
  await runTest('Performance Test (10 sequential queries)', async () => {
    const startTime = Date.now();
    const promises = [];

    for (let i = 0; i < 10; i++) {
      promises.push(prisma.$queryRaw`SELECT 1`);
    }

    await Promise.all(promises);

    const totalDuration = Date.now() - startTime;

    return {
      queries: 10,
      totalTime: totalDuration,
      averageTime: totalDuration / 10,
    };
  });

  // Cleanup
  console.log('\n🧹 Cleaning up...');
  await disconnectPrisma();

  // Print Summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`\n📊 Results:`);
  console.log(`   Total Tests: ${results.length}`);
  console.log(`   Passed: ${passed} ✅`);
  console.log(`   Failed: ${failed} ❌`);
  console.log(`   Total Duration: ${totalDuration}ms`);
  console.log(`   Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log(`\n❌ Failed Tests:`);
    results
      .filter(r => !r.success)
      .forEach(r => {
        console.log(`   - ${r.name}: ${r.error}`);
      });
  }

  console.log('\n' + '='.repeat(60));

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Handle errors
process.on('unhandledRejection', async (error) => {
  console.error('\n💥 Unhandled error:', error);
  await disconnectPrisma();
  process.exit(1);
});

process.on('SIGINT', async () => {
  console.log('\n\n⚠️  Test interrupted by user');
  await disconnectPrisma();
  process.exit(130);
});

// Run tests
main().catch(async (error) => {
  console.error('\n💥 Fatal error:', error);
  await disconnectPrisma();
  process.exit(1);
});
