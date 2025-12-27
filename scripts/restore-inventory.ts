/**
 * Script para restaurar inventario completo desde un backup
 * Incluye: Accounts, Slots, Licenses, Digital Content, y Variants
 * 
 * v2.1.0: Usa product ID para matching correcto
 * 
 * Uso: npx ts-node scripts/restore-inventory.ts [archivo-backup.json]
 * Por defecto usa: backups/inventory-backup-latest.json
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
    availableSlots?: number;
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
    id?: string;  // Product ID (v2.1.0+)
    name: string;
    description: string | null;
    category: string;
    imageUrl: string | null;
    deliveryDetails?: any;
    isActive?: boolean;
    providerEmail: string;
    providerName?: string | null;
    variants?: BackupVariant[];
    accounts: BackupAccount[];
    licenses?: BackupLicense[];
    digitalContents?: BackupDigitalContent[];
}

interface BackupData {
    exportedAt: string;
    version: string;
    products: BackupProduct[];
    stats: {
        totalProducts: number;
        totalAccounts: number;
        totalSlots: number;
        totalLicenses?: number;
        totalDigitalContents?: number;
        totalVariants?: number;
    };
}

async function main() {
    // Obtener archivo de backup desde argumentos o usar el default
    const backupFile = process.argv[2] || path.join(process.cwd(), 'backups', 'inventory-backup-latest.json');

    console.log('🔄 Iniciando restauración de inventario (v2.1.0)...\n');
    console.log(`📁 Archivo de backup: ${backupFile}\n`);

    // Verificar que el archivo existe
    if (!fs.existsSync(backupFile)) {
        console.error(`❌ Archivo no encontrado: ${backupFile}`);
        console.log('\n💡 Primero ejecuta el backup con: npx ts-node scripts/backup-inventory.ts');
        process.exit(1);
    }

    try {
        // Leer archivo de backup
        const backupContent = fs.readFileSync(backupFile, 'utf-8');
        const backupData: BackupData = JSON.parse(backupContent);

        console.log(`📅 Backup exportado: ${backupData.exportedAt}`);
        console.log(`📦 Versión del backup: ${backupData.version}`);

        const hasProductIds = backupData.version >= '2.1.0';
        if (hasProductIds) {
            console.log('✅ Backup incluye product IDs - matching exacto');
        } else {
            console.log('⚠️  Backup antiguo sin product IDs - matching por nombre');
        }

        console.log(`📊 Estadísticas del backup:`);
        console.log(`   - Productos: ${backupData.stats.totalProducts}`);
        console.log(`   - Cuentas: ${backupData.stats.totalAccounts}`);
        console.log(`   - Slots: ${backupData.stats.totalSlots}`);
        if (backupData.stats.totalLicenses) console.log(`   - Licencias: ${backupData.stats.totalLicenses}`);
        if (backupData.stats.totalDigitalContents) console.log(`   - Contenido digital: ${backupData.stats.totalDigitalContents}`);
        if (backupData.stats.totalVariants) console.log(`   - Variantes: ${backupData.stats.totalVariants}`);
        console.log('');

        let productsCreated = 0;
        let productsSkipped = 0;
        let productsNotFound = 0;
        let accountsCreated = 0;
        let slotsCreated = 0;
        let licensesCreated = 0;
        let contentsCreated = 0;
        let variantsCreated = 0;

        for (const productData of backupData.products) {
            const productLabel = productData.id
                ? `${productData.name} [${productData.id.slice(-6)}]`
                : productData.name;
            console.log(`\n📦 Procesando: ${productLabel} (${productData.category})`);

            // Buscar el proveedor por email
            const provider = await prisma.user.findUnique({
                where: { email: productData.providerEmail }
            });

            if (!provider) {
                console.log(`   ⚠️  Proveedor no encontrado: ${productData.providerEmail} - Saltando producto`);
                productsSkipped++;
                continue;
            }

            // Buscar producto: primero por ID (si existe), luego por nombre
            let product = null;

            if (productData.id) {
                // v2.1.0+: Buscar por ID exacto
                product = await prisma.product.findUnique({
                    where: { id: productData.id }
                });

                if (!product) {
                    console.log(`   ⚠️  Producto con ID ${productData.id.slice(-6)} no encontrado en DB`);
                    productsNotFound++;
                    continue;
                }
            } else {
                // Legacy: Buscar por nombre y proveedor (puede haber duplicados)
                product = await prisma.product.findFirst({
                    where: {
                        name: productData.name,
                        providerId: provider.id
                    }
                });
            }

            if (!product) {
                // Crear el producto si no existe
                product = await prisma.product.create({
                    data: {
                        providerId: provider.id,
                        name: productData.name,
                        description: productData.description,
                        category: productData.category,
                        imageUrl: productData.imageUrl,
                        deliveryDetails: productData.deliveryDetails || [],
                        isActive: productData.isActive ?? true
                    }
                });

                productsCreated++;
                console.log(`   ✅ Producto creado`);

                // Crear variantes
                if (productData.variants && productData.variants.length > 0) {
                    for (const variantData of productData.variants) {
                        await prisma.productVariant.create({
                            data: {
                                productId: product.id,
                                name: variantData.name,
                                price: parseFloat(variantData.price),
                                durationDays: variantData.durationDays,
                                isRenewable: variantData.isRenewable
                            }
                        });
                        variantsCreated++;
                    }
                    console.log(`      📋 ${productData.variants.length} variantes creadas`);
                } else {
                    await prisma.productVariant.create({
                        data: {
                            productId: product.id,
                            name: 'Standard',
                            price: 0,
                            durationDays: 30,
                            isRenewable: true
                        }
                    });
                    variantsCreated++;
                }
            } else {
                console.log(`   ℹ️  Producto ya existe, agregando inventario`);
            }

            // === RESTAURAR CUENTAS (streaming/AI) ===
            for (const accountData of productData.accounts) {
                const existingAccount = await prisma.inventoryAccount.findFirst({
                    where: {
                        productId: product.id,
                        email: accountData.email
                    }
                });

                if (existingAccount) {
                    console.log(`   ⏭️  Cuenta ya existe: ${accountData.email}`);
                    continue;
                }

                const account = await prisma.inventoryAccount.create({
                    data: {
                        productId: product.id,
                        email: accountData.email,
                        passwordHash: accountData.password,
                        platformType: accountData.platformType,
                        totalSlots: accountData.totalSlots,
                        availableSlots: accountData.availableSlots ??
                            (accountData.slots.length > 0
                                ? accountData.slots.filter(s => s.status === 'available').length
                                : accountData.totalSlots),
                        expiryDate: accountData.expiryDate ? new Date(accountData.expiryDate) : null
                    }
                });

                accountsCreated++;
                console.log(`   ✅ Cuenta creada: ${accountData.email} (${accountData.totalSlots} slots)`);

                // Crear slots
                if (accountData.slots.length > 0) {
                    for (const slotData of accountData.slots) {
                        await prisma.inventorySlot.create({
                            data: {
                                accountId: account.id,
                                profileName: slotData.profileName,
                                pinCode: slotData.pinCode,
                                status: slotData.status
                            }
                        });
                        slotsCreated++;
                    }
                    console.log(`      📌 ${accountData.slots.length} slots creados`);
                }
            }

            // === RESTAURAR LICENCIAS ===
            if (productData.licenses && productData.licenses.length > 0) {
                let licensesAdded = 0;
                for (const licenseData of productData.licenses) {
                    const existingLicense = await prisma.inventoryLicense.findFirst({
                        where: {
                            productId: product.id,
                            licenseKey: licenseData.licenseKey
                        }
                    });

                    if (existingLicense) {
                        continue;
                    }

                    await prisma.inventoryLicense.create({
                        data: {
                            productId: product.id,
                            licenseKey: licenseData.licenseKey,
                            activationType: licenseData.activationType,
                            status: licenseData.status
                        }
                    });
                    licensesCreated++;
                    licensesAdded++;
                }
                if (licensesAdded > 0) {
                    console.log(`   🔑 ${licensesAdded} licencias creadas`);
                }
            }

            // === RESTAURAR CONTENIDO DIGITAL ===
            if (productData.digitalContents && productData.digitalContents.length > 0) {
                let contentsAdded = 0;
                for (const contentData of productData.digitalContents) {
                    const existingContent = await prisma.digitalContent.findFirst({
                        where: {
                            productId: product.id,
                            contentType: contentData.contentType
                        }
                    });

                    if (existingContent) {
                        continue;
                    }

                    await prisma.digitalContent.create({
                        data: {
                            productId: product.id,
                            contentType: contentData.contentType,
                            resourceUrl: contentData.resourceUrl,
                            liveDate: contentData.liveDate ? new Date(contentData.liveDate) : null,
                            coverImageUrl: contentData.coverImageUrl
                        }
                    });
                    contentsCreated++;
                    contentsAdded++;
                }
                if (contentsAdded > 0) {
                    console.log(`   📚 ${contentsAdded} contenidos digitales creados`);
                }
            }
        }

        console.log('\n' + '='.repeat(50));
        console.log('✅ Restauración completada!\n');
        console.log('📊 Resumen:');
        console.log(`   - Productos creados: ${productsCreated}`);
        console.log(`   - Productos omitidos (proveedor no encontrado): ${productsSkipped}`);
        console.log(`   - Productos no encontrados por ID: ${productsNotFound}`);
        console.log(`   - Variantes creadas: ${variantsCreated}`);
        console.log(`   - Cuentas creadas: ${accountsCreated}`);
        console.log(`   - Slots creados: ${slotsCreated}`);
        console.log(`   - Licencias creadas: ${licensesCreated}`);
        console.log(`   - Contenidos digitales creados: ${contentsCreated}`);

    } catch (error) {
        console.error('❌ Error durante la restauración:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

main();
