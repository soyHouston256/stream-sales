/**
 * Script para diagnosticar problemas de stock
 * 
 * Uso: npx ts-node scripts/diagnose-stock.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Diagnóstico de stock...\n');

    try {
        const products = await prisma.product.findMany({
            where: { isActive: true },
            include: {
                inventoryAccounts: {
                    include: { slots: true }
                },
                inventoryLicenses: true,
            }
        });

        for (const product of products) {
            console.log(`\n📦 ${product.name} (${product.category})`);

            // Calcular stock como lo hace el API
            let totalFullAccounts = 0;
            let availableFullAccounts = 0;
            let totalProfileSlots = 0;
            let availableProfileSlots = 0;

            for (const account of product.inventoryAccounts) {
                if (account.totalSlots === 1) {
                    // Cuenta completa
                    totalFullAccounts += 1;
                    availableFullAccounts += account.availableSlots;
                } else {
                    // Cuenta con perfiles
                    totalProfileSlots += account.totalSlots;
                    availableProfileSlots += account.availableSlots;
                }
            }

            const totalLicenses = product.inventoryLicenses.length;
            const availableLicenses = product.inventoryLicenses.filter(l => l.status === 'available').length;

            console.log(`   Cuentas de inventario: ${product.inventoryAccounts.length}`);

            if (product.inventoryAccounts.length > 0) {
                for (const acc of product.inventoryAccounts) {
                    console.log(`     - ${acc.email}: totalSlots=${acc.totalSlots}, availableSlots=${acc.availableSlots}, slots en DB=${acc.slots.length}`);
                }
            }

            console.log(`   📊 Cálculo stock:`);
            console.log(`     - Full accounts: ${availableFullAccounts}/${totalFullAccounts}`);
            console.log(`     - Profile slots: ${availableProfileSlots}/${totalProfileSlots}`);
            console.log(`     - Licenses: ${availableLicenses}/${totalLicenses}`);

            const hasStock = availableFullAccounts > 0 || availableProfileSlots > 0 || availableLicenses > 0;
            console.log(`   ${hasStock ? '✅ STOCK ONLINE' : '❌ SIN STOCK'}`);
        }

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

main();
