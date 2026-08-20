import 'dotenv/config';
import { PrismaClient, PaymentMethod, SaleStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Iniciando seed de vendas (Testes de Filtro)...');

  // Obter produtos
  let products = await prisma.product.findMany();
  if (products.length === 0) {
    console.log('Nenhum produto encontrado no banco para gerar vendas.');
    return;
  }

  // Atualizar costPrice dos produtos que estao zerados (para ter lucro real nos testes)
  console.log('Atualizando custo dos produtos para termos lucro simulado...');
  for (let p of products) {
    if (p.costPrice === 0) {
      const newCost = Number((p.price * 0.5).toFixed(2)); // Custo eh 50% do preco para simulacao
      await prisma.product.update({
        where: { id: p.id },
        data: { costPrice: newCost }
      });
      p.costPrice = newCost;
    }
  }

  const paymentMethods = [PaymentMethod.MONEY, PaymentMethod.PIX, PaymentMethod.CREDIT, PaymentMethod.DEBIT];

  // Datas passadas
  const now = new Date();
  
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  yesterday.setHours(10, 30);

  const lastWeek = new Date(now);
  lastWeek.setDate(now.getDate() - 7);
  lastWeek.setHours(14, 15);

  const lastMonth = new Date(now);
  lastMonth.setMonth(now.getMonth() - 1);
  lastMonth.setHours(18, 45);

  const twoDaysAgo = new Date(now);
  twoDaysAgo.setDate(now.getDate() - 2);
  twoDaysAgo.setHours(20, 0);

  const testDates = [
    now,
    yesterday,
    lastWeek,
    lastMonth,
    twoDaysAgo
  ];

  console.log('Limpando vendas antigas para um teste limpo...');
  await prisma.saleItem.deleteMany({});
  await prisma.cashMovement.deleteMany({ where: { type: 'SALE' } });
  await prisma.sale.deleteMany({});

  console.log('Gerando 25 vendas aleatórias...');
  for (let i = 0; i < 25; i++) {
    // Escolher 2 produtos aleatórios
    const p1 = products[Math.floor(Math.random() * products.length)];
    const p2 = products[Math.floor(Math.random() * products.length)];
    
    const qty1 = Math.floor(Math.random() * 4) + 1;
    const qty2 = Math.floor(Math.random() * 2) + 1;

    const totalCost = (p1.costPrice * qty1) + (p2.costPrice * qty2);
    const total = (p1.price * qty1) + (p2.price * qty2);
    
    const method = paymentMethods[i % paymentMethods.length];
    const date = testDates[i % testDates.length];

    await prisma.sale.create({
      data: {
        total,
        totalCost,
        paymentMethod: method,
        status: SaleStatus.COMPLETED,
        createdAt: date,
        items: {
          create: [
            { productId: p1.id, quantity: qty1, price: p1.price, costPrice: p1.costPrice },
            { productId: p2.id, quantity: qty2, price: p2.price, costPrice: p2.costPrice },
          ]
        }
      }
    });
  }

  console.log('Seed de vendas finalizada com sucesso! 25 vendas geradas em diversas datas e métodos.');
}

main()
  .catch(e => {
    console.error('Erro ao gerar seed de vendas:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
