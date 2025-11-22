import { PrismaClient } from '../../prisma-client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(); // no adapter/accelerateUrl needed in v4

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
