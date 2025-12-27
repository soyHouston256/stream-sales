/**
 * Script para crear backup completo del inventario
 * Incluye: Accounts, Slots, Licenses, Digital Content, y Variants
 * 
 * v2.1.0: Incluye productId para identificación única
 * 
 * Uso: npx ts-node scripts/backup-inventory.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// === TIPOS DE BACKUP ===

interface BackupSlot {
    profileName: string | null;
    pinCode: string | null;
    status: string;
}

interface BackupAccount {
    email: string;
    password: string;
    platformType: string;
    totalSlots: number;
    availableSlots: number;
    expiryDate: string | null;
    slots: BackupSlot[];
}

interface BackupLicense {
    licenseKey: string;
    activationType: string;
    status: string;
}

interface BackupDigitalContent {
    contentType: string;
    resourceUrl: string | null;
    liveDate: string | null;
    coverImageUrl: string | null;
}

interface BackupVariant {
    name: string;
    price: string;
    durationDays: number | null;
    isRenewable: boolean;
}

interface BackupProduct {
    id: string;  // Product ID for unique identification
    name: string;
    description: string | null;
    category: string;
    imageUrl: string | null;
    deliveryDetails: any;
    isActive: boolean;
    providerEmail: string;
    providerName: string | null;
    variants: BackupVariant[];
    accounts: BackupAccount[];
    licenses: BackupLicense[];
    digitalContents: BackupDigitalContent[];
}

interface BackupData {
    exportedAt: string;
    version: string;
    products: BackupProduct[];
    stats: {
        totalProducts: number;
        totalAccounts: number;
        totalSlots: number;
        totalLicenses: number;
        totalDigitalContents: number;
        totalVariants: number;
    };
}

async function main() {
    console.log('🔄 Iniciando backup completo de inventario (v2.1.0)...\n');

    try {
        // Obtener todos los productos activos con todas sus relaciones
        const products = await prisma.product.findMany({
            where: {
                isActive: true,
            },
            include: {
                provider: {
                    select: {
                        email: true,
                        name: true,
                    }
                },
                variants: true,
                inventoryAccounts: {
                    include: {
                        slots: true
                    }
                },
                inventoryLicenses: true,
                digitalContents: true,
            }
        });

        let totalAccounts = 0;
        let totalSlots = 0;
        let totalLicenses = 0;
        let totalDigitalContents = 0;
        let totalVariants = 0;

        const backupProducts: BackupProduct[] = products.map(product => {
            // Backup de variantes
            const variants: BackupVariant[] = product.variants.map(variant => {
                totalVariants++;
                return {
                    name: variant.name,
                    price: variant.price.toString(),
                    durationDays: variant.durationDays,
                    isRenewable: variant.isRenewable,
                };
            });

            // Backup de cuentas (streaming/AI)
            const accounts: BackupAccount[] = product.inventoryAccounts.map(account => {
                totalAccounts++;
                totalSlots += account.slots.length;

                return {
                    email: account.email,
                    password: account.passwordHash,
                    platformType: account.platformType,
                    totalSlots: account.totalSlots,
                    availableSlots: account.availableSlots,
                    expiryDate: account.expiryDate ? account.expiryDate.toISOString() : null,
                    slots: account.slots.map(slot => ({
                        profileName: slot.profileName,
                        pinCode: slot.pinCode,
                        status: slot.status
                    }))
                };
            });

            // Backup de licencias
            const licenses: BackupLicense[] = product.inventoryLicenses.map(license => {
                totalLicenses++;
                return {
                    licenseKey: license.licenseKey,
                    activationType: license.activationType,
                    status: license.status,
                };
            });

            // Backup de contenido digital
            const digitalContents: BackupDigitalContent[] = product.digitalContents.map(content => {
                totalDigitalContents++;
                return {
                    contentType: content.contentType,
                    resourceUrl: content.resourceUrl,
                    liveDate: content.liveDate ? content.liveDate.toISOString() : null,
                    coverImageUrl: content.coverImageUrl,
                };
            });

            return {
                id: product.id,  // Include product ID
                name: product.name,
                description: product.description,
                category: product.category,
                imageUrl: product.imageUrl,
                deliveryDetails: product.deliveryDetails,
                isActive: product.isActive,
                providerEmail: product.provider.email,
                providerName: product.provider.name,
                variants,
                accounts,
                licenses,
                digitalContents,
            };
        });

        const backupData: BackupData = {
            exportedAt: new Date().toISOString(),
            version: '2.1.0', // Updated version
            products: backupProducts,
            stats: {
                totalProducts: products.length,
                totalAccounts,
                totalSlots,
                totalLicenses,
                totalDigitalContents,
                totalVariants,
            }
        };

        // Crear directorio de backups si no existe
        const backupDir = path.join(process.cwd(), 'backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        // Generar nombre de archivo con timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `inventory-backup-${timestamp}.json`;
        const filepath = path.join(backupDir, filename);

        // Guardar archivo JSON
        fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2), 'utf-8');

        // También guardar una copia como "latest"
        const latestPath = path.join(backupDir, 'inventory-backup-latest.json');
        fs.writeFileSync(latestPath, JSON.stringify(backupData, null, 2), 'utf-8');

        console.log('✅ Backup completado exitosamente!\n');
        console.log('📊 Estadísticas:');
        console.log(`   - Productos: ${products.length}`);
        console.log(`   - Variantes: ${totalVariants}`);
        console.log(`   - Cuentas de streaming/AI: ${totalAccounts}`);
        console.log(`   - Slots/Perfiles: ${totalSlots}`);
        console.log(`   - Licencias: ${totalLicenses}`);
        console.log(`   - Contenido digital: ${totalDigitalContents}`);
        console.log(`\n📁 Archivos guardados:`);
        console.log(`   - ${filepath}`);
        console.log(`   - ${latestPath}`);

        // Mostrar resumen por producto
        console.log('\n📋 Detalle por producto:');
        backupProducts.forEach((product, index) => {
            console.log(`   ${index + 1}. ${product.name} [${product.id.slice(-6)}] (${product.category})`);
            console.log(`      - Proveedor: ${product.providerEmail}`);
            if (product.variants.length > 0) {
                console.log(`      - Variantes: ${product.variants.length}`);
            }
            if (product.accounts.length > 0) {
                const slotsCount = product.accounts.reduce((sum, acc) => sum + acc.slots.length, 0);
                const fullAccounts = product.accounts.filter(a => a.totalSlots === 1).length;
                const profileAccounts = product.accounts.filter(a => a.totalSlots > 1).length;
                console.log(`      - Cuentas: ${product.accounts.length} (${fullAccounts} completas, ${profileAccounts} con perfiles)`);
                if (slotsCount > 0) {
                    console.log(`      - Slots/Perfiles: ${slotsCount}`);
                }
            }
            if (product.licenses.length > 0) {
                const available = product.licenses.filter(l => l.status === 'available').length;
                console.log(`      - Licencias: ${product.licenses.length} (${available} disponibles)`);
            }
            if (product.digitalContents.length > 0) {
                console.log(`      - Contenido digital: ${product.digitalContents.length}`);
            }
        });

    } catch (error) {
        console.error('❌ Error durante el backup:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

main();
