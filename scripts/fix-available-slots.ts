/**
 * Script para verificar y arreglar el availableSlots de las cuentas
 * El problema es que availableSlots no se está calculando correctamente
 * 
 * Uso: npx ts-node scripts/fix-available-slots.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔧 Verificando y arreglando availableSlots...\n');

    try {
        // Obtener todas las cuentas con sus slots
        const accounts = await prisma.inventoryAccount.findMany({
            include: {
                slots: true,
                product: {
                    select: { name: true }
                }
            }
        });

        console.log(`📊 Encontradas ${accounts.length} cuentas de inventario\n`);

        let fixed = 0;
        for (const account of accounts) {
            const availableSlotsCount = account.slots.filter(s => s.status === 'available').length;
            const totalSlotsCount = account.slots.length;

            // Para cuentas completas (sin slots), availableSlots debe ser totalSlots
            // Para cuentas con perfiles, availableSlots debe ser el conteo de slots disponibles
            const expectedAvailable = totalSlotsCount > 0 ? availableSlotsCount : account.totalSlots;
            const expectedTotal = totalSlotsCount > 0 ? totalSlotsCount : account.totalSlots;

            const needsFix = account.availableSlots !== expectedAvailable || account.totalSlots !== expectedTotal;

            if (needsFix) {
                console.log(`\n📦 ${account.product.name}`);
                console.log(`   📧 ${account.email}`);
                console.log(`   ❌ Actual: totalSlots=${account.totalSlots}, availableSlots=${account.availableSlots}`);
                console.log(`   ✅ Correcto: totalSlots=${expectedTotal}, availableSlots=${expectedAvailable}`);
                console.log(`   📌 Slots en DB: ${totalSlotsCount} (${availableSlotsCount} disponibles)`);

                await prisma.inventoryAccount.update({
                    where: { id: account.id },
                    data: {
                        totalSlots: expectedTotal,
                        availableSlots: expectedAvailable
                    }
                });

                fixed++;
            }
        }

        console.log('\n' + '='.repeat(50));
        if (fixed > 0) {
            console.log(`✅ Se arreglaron ${fixed} cuentas`);
        } else {
            console.log('✅ Todas las cuentas tienen availableSlots correcto');
        }

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

main();
