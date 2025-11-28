import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seed script for Referral Approval Configuration
 *
 * This script inserts an initial configuration for the referral approval fee.
 * Run with: npx tsx prisma/seed-referral-config.ts
 *
 * IMPORTANT: This should be run after the migration has been applied.
 */
async function main() {
  console.log('🌱 Seeding referral approval configuration...');

  try {
    // Check if there's already an active configuration
    const existingConfig = await prisma.referralApprovalConfig.findFirst({
      where: { isActive: true },
    });

    if (existingConfig) {
      console.log('✅ Active referral approval configuration already exists:');
      console.log(`   ID: ${existingConfig.id}`);
      console.log(`   Approval Fee: $${existingConfig.approvalFee.toString()} USD`);
      console.log(`   Effective From: ${existingConfig.effectiveFrom.toISOString()}`);
      console.log('⏭️  Skipping seed...');
      return;
    }

    // Create initial configuration with a default fee of $10.00
    const config = await prisma.referralApprovalConfig.create({
      data: {
        approvalFee: 10.0, // Default: $10 USD
        isActive: true,
        effectiveFrom: new Date(),
      },
    });

    console.log('✅ Successfully created referral approval configuration:');
    console.log(`   ID: ${config.id}`);
    console.log(`   Approval Fee: $${config.approvalFee.toString()} USD`);
    console.log(`   Effective From: ${config.effectiveFrom.toISOString()}`);
    console.log(`   Created At: ${config.createdAt.toISOString()}`);
  } catch (error) {
    console.error('❌ Error seeding referral approval configuration:', error);
    throw error;
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('✅ Seed completed successfully');
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
