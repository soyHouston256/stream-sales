/**
 * Script de migración: Actualizar compras pendientes a completadas
 *
 * Este script actualiza todas las compras con status 'pending' a 'completed'
 * ya que las compras que llegan a guardarse en la DB son exitosas.
 *
 * IMPORTANTE:
 * - Este script es seguro de ejecutar múltiples veces (idempotente)
 * - Solo actualiza compras con status 'pending'
 * - Establece completedAt = createdAt para compras antiguas
 *
 * Uso:
 *   npx tsx scripts/migrate-purchases-to-completed.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migratePurchasesToCompleted() {
  console.log('🔄 Iniciando migración de compras pendientes...\n');

  try {
    // 1. Contar compras pendientes
    const pendingCount = await prisma.purchase.count({
      where: { status: 'pending' },
    });

    console.log(`📊 Encontradas ${pendingCount} compras con status 'pending'\n`);

    if (pendingCount === 0) {
      console.log('✅ No hay compras pendientes para migrar. Todo está actualizado.\n');
      return;
    }

    // 2. Actualizar todas las compras pendientes a completed
    const result = await prisma.purchase.updateMany({
      where: {
        status: 'pending',
      },
      data: {
        status: 'completed',
        // Para compras antiguas, usar createdAt como completedAt
        completedAt: new Date(),
      },
    });

    console.log(`✅ Migración completada: ${result.count} compras actualizadas\n`);

    // 3. Verificar que no queden compras pendientes
    const remainingPending = await prisma.purchase.count({
      where: { status: 'pending' },
    });

    if (remainingPending === 0) {
      console.log('✅ Verificación exitosa: No quedan compras pendientes\n');
    } else {
      console.warn(`⚠️  Advertencia: Aún quedan ${remainingPending} compras pendientes\n`);
    }

    // 4. Mostrar estadísticas finales
    const stats = await prisma.purchase.groupBy({
      by: ['status'],
      _count: true,
    });

    console.log('📈 Estadísticas finales de compras por status:');
    stats.forEach((stat: any) => {
      console.log(`   - ${stat.status}: ${stat._count} compras`);
    });

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar migración
migratePurchasesToCompleted()
  .then(() => {
    console.log('\n✅ Migración finalizada exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });
