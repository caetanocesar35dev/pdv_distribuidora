import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Iniciando seed do banco de dados...');

  // 1. Criar usuário administrador padrão
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@distribuidora.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    console.warn('⚠️ Credenciais de admin não encontradas no .env, usando o padrão.');
  }

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: 'Administrador',
        role: Role.ADMIN,
      },
    });
    console.log(`Usuário admin criado: ${admin.email}`);
  } else {
    console.log('Usuário admin já cadastrado.');
  }

  // 2. Criar produtos iniciais para testes
  const initialProducts = [
    { code: '7891000100101', name: 'Cerveja Skol Lata 350ml', price: 4.50, stock: 120 },
    { code: '7891000100200', name: 'Cerveja Heineken Long Neck 330ml', price: 8.50, stock: 80 },
    { code: '7891000300303', name: 'Refrigerante Coca-Cola 2L', price: 9.00, stock: 50 },
    { code: '7891000400402', name: 'Água Mineral Sem Gás 500ml', price: 2.50, stock: 150 },
    { code: '7891000500501', name: 'Cerveja Amstel Lata 350ml', price: 4.20, stock: 96 },
    { code: '7891000600600', name: 'Energético Monster 473ml', price: 10.00, stock: 40 },
  ];

  for (const productData of initialProducts) {
    const existingProduct = await prisma.product.findUnique({
      where: { code: productData.code },
    });

    if (!existingProduct) {
      const product = await prisma.product.create({
        data: productData,
      });
      console.log(`Produto criado: ${product.name} (Código: ${product.code})`);
    } else {
      console.log(`Produto já existente: ${existingProduct.name}`);
    }
  }

  console.log('Seed finalizado com sucesso!');
}

main()
  .catch((e) => {
    console.error('Erro ao rodar o seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
