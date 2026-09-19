import { PrismaClient } from '@prisma/client';

// Single Prisma instance shared across the app
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export default prisma;
