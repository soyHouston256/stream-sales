const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAdmin() {
  try {
    const admin = await prisma.user.findFirst({
      where: { role: 'admin' },
      include: { wallet: true }
    });

    if (admin) {
      console.log('✓ Admin encontrado:', {
        id: admin.id,
        email: admin.email,
        role: admin.role,
        hasWallet: !!admin.wallet,
        walletId: admin.wallet?.id
      });
    } else {
      console.log('✗ No existe usuario admin');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdmin();
