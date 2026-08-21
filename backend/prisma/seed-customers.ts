import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Iniciando seed de clientes...');

  const customers = [
    {
      name: 'Bar do Zé',
      phone: '(11) 98765-4321',
      balance: 150.50,
    },
    {
      name: 'Restaurante Sabor Mineiro',
      phone: '(11) 91234-5678',
      balance: 420.00,
    },
    {
      name: 'Carlos Alberto (Churrasco)',
      phone: '(11) 99999-1111',
      balance: 0.00,
    },
    {
      name: 'Adega Grau Máximo',
      phone: '(11) 97777-2222',
      balance: 85.00,
    },
    {
      name: 'Dona Maria (Mercadinho)',
      phone: '(11) 98888-3333',
      balance: 1200.00,
    }
  ];

  for (const customer of customers) {
    await prisma.customer.create({
      data: customer,
    });
  }

  console.log('✅ Seed de clientes finalizado com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
