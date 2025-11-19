import { PrismaClient } from '@prisma/client';
import { Decimal } from 'decimal.js';

const prisma = new PrismaClient();

/**
 * Seed Commission Configuration
 *
 * Creates initial commission configuration for:
 * - Sale Commission: 5.00% (default)
 * - Registration Commission: 0.00% (default - not active yet)
 *
 * This script is idempotent - safe to run multiple times.
 */

async function seedCommissionConfig() {
  console.log('🌱 Seeding commission configuration...\n');

  try {
    // Check if sale commission config exists
    const existingSaleConfig = await prisma.commissionConfig.findFirst({
      where: {
        type: 'sale',
        isActive: true,
      },
    });

    if (existingSaleConfig) {
      console.log('✅ Sale commission config already exists:');
      console.log(`   Rate: ${existingSaleConfig.rate}%`);
      console.log(`   Effective from: ${existingSaleConfig.effectiveFrom}`);
    } else {
      // Create initial sale commission config (5%)
      const saleConfig = await prisma.commissionConfig.create({
        data: {
          type: 'sale',
          rate: new Decimal(5.0), // 5%
          isActive: true,
          effectiveFrom: new Date(),
        },
      });

      console.log('✅ Created sale commission config:');
      console.log(`   ID: ${saleConfig.id}`);
      console.log(`   Rate: ${saleConfig.rate}%`);
      console.log(`   Effective from: ${saleConfig.effectiveFrom}`);
    }

    console.log('');

    // Check if registration commission config exists
    const existingRegistrationConfig = await prisma.commissionConfig.findFirst(
      {
        where: {
          type: 'registration',
          isActive: true,
        },
      }
    );

    if (existingRegistrationConfig) {
      console.log('✅ Registration commission config already exists:');
      console.log(`   Rate: ${existingRegistrationConfig.rate}%`);
      console.log(
        `   Effective from: ${existingRegistrationConfig.effectiveFrom}`
      );
    } else {
      // Create initial registration commission config (0%)
      const registrationConfig = await prisma.commissionConfig.create({
        data: {
          type: 'registration',
          rate: new Decimal(0.0), // 0% (not active yet)
          isActive: true,
          effectiveFrom: new Date(),
        },
      });

      console.log('✅ Created registration commission config:');
      console.log(`   ID: ${registrationConfig.id}`);
      console.log(`   Rate: ${registrationConfig.rate}%`);
      console.log(`   Effective from: ${registrationConfig.effectiveFrom}`);
    }

    console.log('\n✅ Commission configuration seeded successfully!');
    console.log(
      '\n📝 Next steps:'
    );
    console.log(
      '   - Sale commission is now configured at 5% (you can change it from admin dashboard)'
    );
    console.log(
      '   - Registration commission is at 0% (configure when you enable referral system)'
    );
  } catch (error) {
    console.error('❌ Error seeding commission configuration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedCommissionConfig()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
