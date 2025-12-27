/**
 * Script para resetear/eliminar todo el inventario
 * ⚠️ PELIGROSO: Elimina todas las cuentas, slots, licencias y contenido digital
 * 
 * Uso: npx ts-node scripts/reset-inventory.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('⚠️  RESET DE INVENTARIO\n');
    console.log('Este script eliminará TODO el inventario:');
    console.log('  - Slots de inventario');
    console.log('  - Cuentas de inventario');
    console.log('  - Licencias de inventario');
    console.log('  - Contenido digital\n');
    console.log('Los productos se mantendrán pero quedarán sin inventario.\n');

    try {
        // Contar antes de eliminar
        const slotsCount = await prisma.inventorySlot.count();
        const accountsCount = await prisma.inventoryAccount.count();
        const licensesCount = await prisma.inventoryLicense.count();
        const contentsCount = await prisma.digitalContent.count();

        console.log('📊 Estado actual:');
        console.log(`   - Slots: ${slotsCount}`);
        console.log(`   - Cuentas: ${accountsCount}`);
        console.log(`   - Licencias: ${licensesCount}`);
        console.log(`   - Contenido digital: ${contentsCount}\n`);

        console.log('🗑️  Eliminando inventario...\n');

        // Eliminar en orden correcto (por relaciones)
        // 1. Slots primero (dependen de accounts)
        const deletedSlots = await prisma.inventorySlot.deleteMany({});
        console.log(`   ✅ Slots eliminados: ${deletedSlots.count}`);

        // 2. Cuentas
        const deletedAccounts = await prisma.inventoryAccount.deleteMany({});
        console.log(`   ✅ Cuentas eliminadas: ${deletedAccounts.count}`);

        // 3. Licencias
        const deletedLicenses = await prisma.inventoryLicense.deleteMany({});
        console.log(`   ✅ Licencias eliminadas: ${deletedLicenses.count}`);

        // 4. Contenido digital
        const deletedContents = await prisma.digitalContent.deleteMany({});
        console.log(`   ✅ Contenido digital eliminado: ${deletedContents.count}`);

        console.log('\n' + '='.repeat(50));
        console.log('✅ Reset completado!\n');
        console.log('💡 Ahora puedes restaurar con:');
        console.log('   npx ts-node scripts/restore-inventory.ts\n');

    } catch (error) {
        console.error('❌ Error durante el reset:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

main();
