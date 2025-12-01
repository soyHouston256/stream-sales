import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
  const isDevelopment = process.env.NODE_ENV !== 'production';

  return new PrismaClient({
    log: isDevelopment
      ? ['query', 'error', 'warn']
      : ['error', 'warn'],
    errorFormat: isDevelopment ? 'pretty' : 'minimal',
  });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
