const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const customers = await prisma.customer.findMany({
    include: {
      bottleBalances: true,
      bottleMovements: true
    }
  });
  console.dir(customers, { depth: null });
}
main().catch(console.error).finally(() => prisma.$disconnect());
