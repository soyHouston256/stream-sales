import { prisma } from '../src/infrastructure/database/prisma';

async function main() {
  console.log('🔄 Actualizando rol del usuario seller@streamsales.com...');

  const updated = await prisma.user.update({
    where: {
      email: 'seller@streamsales.com'
    },
    data: {
      role: 'seller'
    }
  });

  console.log('✅ Usuario actualizado:');
  console.log(JSON.stringify(updated, null, 2));
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
