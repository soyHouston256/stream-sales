/**
 * Script de Migración: Re-encriptar Passwords de Productos
 *
 * Este script migra passwords de productos que están en texto plano
 * al formato encriptado usando AES-256-CBC.
 *
 * USO:
 * npx tsx scripts/migrate-encrypt-passwords.ts
 *
 * PRECAUCIÓN:
 * - Hacer backup de la base de datos antes de ejecutar
 * - El script es idempotente (puede ejecutarse múltiples veces)
 * - Los passwords ya encriptados no se modifican
 */

import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// Configuración de encriptación (debe coincidir con PrismaProductRepository)
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY || 'default-insecure-key-change-this-in-production-32bytes';
  const keyBuffer = Buffer.alloc(32);
  const sourceBuffer = Buffer.from(key, 'utf-8');
  sourceBuffer.copy(keyBuffer, 0, 0, Math.min(32, sourceBuffer.length));
  return keyBuffer;
}

function encrypt(text: string, encryptionKey: Buffer): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function isEncrypted(text: string): boolean {
  const parts = text.split(':');
  if (parts.length !== 2) return false;

  try {
    // Verificar que la primera parte sea un IV válido en hex
    const iv = Buffer.from(parts[0], 'hex');
    if (iv.length !== IV_LENGTH) return false;

    // Verificar que la segunda parte sea hex válido
    Buffer.from(parts[1], 'hex');
    return true;
  } catch {
    return false;
  }
}

async function migratePasswords() {
  console.log('🔐 Iniciando migración de passwords...\n');

  const encryptionKey = getEncryptionKey();

  try {
    // 1. Obtener todos los productos
    const products = await prisma.product.findMany({
      select: {
        id: true,
        accountPassword: true,
        category: true,
      },
    });

    console.log(`📦 Encontrados ${products.length} productos en total\n`);

    let encryptedCount = 0;
    let alreadyEncryptedCount = 0;
    let errorCount = 0;

    // 2. Procesar cada producto
    for (const product of products) {
      const isAlreadyEncrypted = isEncrypted(product.accountPassword);

      if (isAlreadyEncrypted) {
        alreadyEncryptedCount++;
        console.log(`✓ ${product.category} (${product.id.substring(0, 8)}...) - Ya encriptado`);
        continue;
      }

      try {
        // Encriptar el password en texto plano
        const encryptedPassword = encrypt(product.accountPassword, encryptionKey);

        // Actualizar en la base de datos
        await prisma.product.update({
          where: { id: product.id },
          data: { accountPassword: encryptedPassword },
        });

        encryptedCount++;
        console.log(`🔒 ${product.category} (${product.id.substring(0, 8)}...) - Encriptado exitosamente`);
      } catch (error) {
        errorCount++;
        console.error(`❌ ${product.category} (${product.id.substring(0, 8)}...) - Error:`, error);
      }
    }

    // 3. Resumen
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE MIGRACIÓN');
    console.log('='.repeat(60));
    console.log(`Total de productos:           ${products.length}`);
    console.log(`Ya encriptados (sin cambios):  ${alreadyEncryptedCount}`);
    console.log(`Recién encriptados:            ${encryptedCount}`);
    console.log(`Errores:                       ${errorCount}`);
    console.log('='.repeat(60));

    if (encryptedCount > 0) {
      console.log('\n✅ Migración completada exitosamente');
      console.log('   Todos los passwords ahora están encriptados con AES-256-CBC');
    } else if (alreadyEncryptedCount === products.length) {
      console.log('\n✅ Todos los passwords ya estaban encriptados');
    } else {
      console.log('\n⚠️  Migración completada con algunos errores');
    }

  } catch (error) {
    console.error('\n❌ Error crítico durante la migración:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar migración
migratePasswords()
  .then(() => {
    console.log('\n🎉 Script finalizado\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script falló:', error);
    process.exit(1);
  });
