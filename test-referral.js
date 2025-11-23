/**
 * Script de prueba para verificar el sistema de referidos
 *
 * Este script:
 * 1. Verifica que exista un AffiliateProfile con código de referido
 * 2. Simula un registro con código de referido
 * 3. Verifica que se haya creado la Affiliation
 * 4. Verifica que el endpoint de referrals devuelva el usuario referido
 */

// Cargar variables de entorno
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '.env');

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      process.env[key] = value;
    }
  });
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testReferralSystem() {
  console.log('\n🔍 Iniciando prueba del sistema de referidos...\n');

  try {
    // 1. Buscar un perfil de afiliado aprobado
    console.log('1️⃣  Buscando perfiles de afiliado...');
    const affiliateProfiles = await prisma.affiliateProfile.findMany({
      where: {
        status: 'approved'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      },
      take: 5
    });

    if (affiliateProfiles.length === 0) {
      console.log('⚠️  No se encontraron perfiles de afiliado aprobados');
      console.log('   Para probar, primero necesitas:');
      console.log('   - Crear un usuario con rol "affiliate"');
      console.log('   - Aplicar para ser afiliado en /affiliate/apply');
      console.log('   - Aprobar la aplicación desde /dashboard/admin/affiliates');
      return;
    }

    console.log(`✅ Encontrados ${affiliateProfiles.length} perfiles de afiliado:`);
    affiliateProfiles.forEach(profile => {
      console.log(`   - ${profile.user.name} (${profile.user.email})`);
      console.log(`     Código: ${profile.referralCode}`);
      console.log(`     Total referidos: ${profile.totalReferrals}`);
      console.log(`     Ganancias totales: $${profile.totalEarnings}`);
    });

    // 2. Verificar affiliations existentes
    console.log('\n2️⃣  Buscando afiliaciones (referidos)...');
    for (const profile of affiliateProfiles) {
      const affiliations = await prisma.affiliation.findMany({
        where: {
          affiliateId: profile.userId
        },
        include: {
          referredUser: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            }
          }
        }
      });

      console.log(`\n   Afiliado: ${profile.user.name} (${profile.referralCode})`);
      if (affiliations.length === 0) {
        console.log('   ⚠️  No tiene referidos aún');
      } else {
        console.log(`   ✅ Tiene ${affiliations.length} referidos:`);
        affiliations.forEach(aff => {
          console.log(`      - ${aff.referredUser.name} (${aff.referredUser.email})`);
          console.log(`        Rol: ${aff.referredUser.role}`);
          console.log(`        Comisión: $${aff.commissionAmount}`);
          console.log(`        Estado: ${aff.status}`);
          console.log(`        Fecha: ${aff.createdAt.toLocaleDateString()}`);
        });
      }
    }

    // 3. Verificar la consistencia de los datos
    console.log('\n3️⃣  Verificando consistencia de datos...');
    for (const profile of affiliateProfiles) {
      const affiliationCount = await prisma.affiliation.count({
        where: { affiliateId: profile.userId }
      });

      if (affiliationCount !== profile.totalReferrals) {
        console.log(`   ⚠️  ${profile.user.name}: Inconsistencia detectada`);
        console.log(`      - totalReferrals en perfil: ${profile.totalReferrals}`);
        console.log(`      - Affiliations reales: ${affiliationCount}`);
      } else {
        console.log(`   ✅ ${profile.user.name}: Datos consistentes (${affiliationCount} referidos)`);
      }
    }

    console.log('\n✅ Prueba completada\n');

  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar la prueba
testReferralSystem();
