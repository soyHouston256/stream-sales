/**
 * Script de Seed: Crear Usuario Admin con Wallet
 *
 * Este script crea el usuario admin necesario para el sistema de comisiones.
 * Cuando un seller compra un producto, el sistema deposita la comisión en la wallet del admin.
 *
 * USO:
 * npx tsx scripts/seed-admin.ts
 *
 * El script es idempotente - puede ejecutarse múltiples veces sin problemas.
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedAdmin() {
  console.log('🌱 Iniciando seed de usuario admin...\n');

  try {
    // 1. Verificar si ya existe el usuario admin
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'admin' },
      include: { wallet: true },
    });

    if (existingAdmin) {
      console.log(`✓ Usuario admin ya existe: ${existingAdmin.email}`);

      // Verificar si tiene wallet
      if (existingAdmin.wallet) {
        console.log(`✓ Admin wallet ya existe (Balance: $${existingAdmin.wallet.balance})`);
        console.log('\n✅ Sistema admin ya está configurado correctamente\n');
        return;
      }

      // Si existe el usuario pero no tiene wallet, crear wallet
      console.log('⚠️  Admin existe pero no tiene wallet. Creando wallet...');
      const wallet = await prisma.wallet.create({
        data: {
          userId: existingAdmin.id,
          balance: 0,
          currency: 'USD',
          status: 'active',
        },
      });

      console.log(`✅ Wallet creada para admin (ID: ${wallet.id})`);
      console.log('\n✅ Sistema admin configurado correctamente\n');
      return;
    }

    // 2. No existe admin, crear usuario admin con wallet
    console.log('📝 No existe usuario admin. Creando...\n');

    const adminEmail = 'admin@streamsales.com';
    const adminPassword = 'admin123'; // CAMBIAR EN PRODUCCIÓN
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const admin = await prisma.user.create({
      data: {
        id: 'admin', // ID fijo para facilitar referencia
        email: adminEmail,
        password: hashedPassword,
        name: 'Administrator',
        role: 'admin',
        wallet: {
          create: {
            balance: 0,
            currency: 'USD',
            status: 'active',
          },
        },
      },
      include: { wallet: true },
    });

    console.log('='.repeat(60));
    console.log('✅ USUARIO ADMIN CREADO EXITOSAMENTE');
    console.log('='.repeat(60));
    console.log(`Email:    ${admin.email}`);
    console.log(`Password: ${adminPassword}`);
    console.log(`Role:     ${admin.role}`);
    console.log(`Wallet:   ${admin.wallet?.id} (Balance: $${admin.wallet?.balance})`);
    console.log('='.repeat(60));
    console.log('\n⚠️  IMPORTANTE: Cambia el password del admin después de iniciar sesión\n');

  } catch (error) {
    console.error('\n❌ Error durante el seed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar seed
seedAdmin()
  .then(() => {
    console.log('🎉 Seed completado\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seed falló:', error);
    process.exit(1);
  });
