import 'dotenv/config';
import { PrismaClient, Role, PaymentMethod, SaleStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Função para gerar data aleatória dentro de um intervalo
function randomDate(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function main() {
  console.log('Iniciando seed completo do banco de dados (Produtos, Clientes e Vendas)...');

  // 1. Criar usuário administrador padrão
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@distribuidora.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

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

  // 2. Criar produtos (com foco em Distribuidora)
  const initialProducts = [
    { code: '7891149103100', name: 'Cerveja Skol Lata 350ml', price: 3.50, costPrice: 2.20, stock: 240, packQuantity: 12 },
    { code: '7891991000826', name: 'Cerveja Brahma Chopp Lata 350ml', price: 3.70, costPrice: 2.30, stock: 240, packQuantity: 12 },
    { code: '7891991295987', name: 'Cerveja Heineken Long Neck 330ml', price: 7.50, costPrice: 5.50, stock: 144, packQuantity: 24 },
    { code: '7891991010344', name: 'Cerveja Amstel Lata 473ml', price: 4.50, costPrice: 3.10, stock: 120, packQuantity: 12 },
    { code: '7891991011884', name: 'Cerveja Spaten Garrafa 600ml', price: 9.00, costPrice: 6.50, stock: 120, packQuantity: 24 },
    { code: '7894900011517', name: 'Refrigerante Coca-Cola 2L', price: 10.00, costPrice: 7.50, stock: 60, packQuantity: 6 },
    { code: '7891991001274', name: 'Refrigerante Guaraná Antarctica 2L', price: 8.50, costPrice: 6.00, stock: 60, packQuantity: 6 },
    { code: '7896021312345', name: 'Água Mineral Minalba Sem Gás 500ml', price: 2.50, costPrice: 1.00, stock: 120, packQuantity: 12 },
    { code: '7896021312352', name: 'Água Mineral Minalba Com Gás 500ml', price: 3.00, costPrice: 1.20, stock: 120, packQuantity: 12 },
    { code: '7896045505012', name: 'Energético Monster Energy 473ml', price: 12.00, costPrice: 8.50, stock: 48, packQuantity: 6 },
    { code: '9002490100070', name: 'Energético Red Bull 250ml', price: 9.00, costPrice: 6.80, stock: 96, packQuantity: 24 },
    { code: '5000281025528', name: 'Gin Tanqueray London Dry 750ml', price: 120.00, costPrice: 95.00, stock: 12, packQuantity: 1 },
    { code: '7312040017034', name: 'Vodka Absolut Original 1L', price: 105.00, costPrice: 80.00, stock: 18, packQuantity: 1 },
    { code: '7891234567890', name: 'Carvão Vegetal Premium 3kg', price: 18.00, costPrice: 10.00, stock: 50, packQuantity: 1 },
    { code: '7899876543210', name: 'Gelo em Cubos 5kg', price: 12.00, costPrice: 5.00, stock: 100, packQuantity: 1 },
    { code: '7892840815159', name: 'Salgadinho Doritos Queijo Nacho 90g', price: 8.50, costPrice: 5.00, stock: 40, packQuantity: 1 },
    { code: '7896000000000', name: 'Amendoim Japonês Dori 150g', price: 6.00, costPrice: 3.50, stock: 60, packQuantity: 1 }
  ];

  let productsCount = 0;
  for (const productData of initialProducts) {
    const existingProduct = await prisma.product.findUnique({ where: { code: productData.code } });
    if (!existingProduct) {
      await prisma.product.create({ data: productData });
      productsCount++;
    }
  }
  console.log(`${productsCount} novos produtos criados (Total: ${initialProducts.length})`);

  // 3. Criar Clientes (incluindo dados do antigo seed-customers.ts)
  const initialCustomers = [
    { name: 'Bar do Zé (José Roberto)', phone: '(11) 98765-4321', balance: 150.50 },
    { name: 'Restaurante Sabor Mineiro', phone: '(11) 91234-5678', balance: 420.00 },
    { name: 'Carlos Alberto (Churrasco)', phone: '(11) 99999-1111', balance: 0.00 },
    { name: 'Adega Grau Máximo', phone: '(11) 97777-2222', balance: 85.00 },
    { name: 'Dona Maria (Mercadinho)', phone: '(11) 98888-3333', balance: 1200.00 },
    { name: 'João Silva', phone: '11999998888', balance: 0 },
    { name: 'Espetinho da Esquina', phone: '11966665555', balance: 0 }
  ];

  let customersCount = 0;
  for (const customerData of initialCustomers) {
    const existingCustomer = await prisma.customer.findFirst({ where: { name: customerData.name } });
    if (!existingCustomer) {
      await prisma.customer.create({ data: customerData });
      customersCount++;
    }
  }
  console.log(`${customersCount} novos clientes criados (Total: ${initialCustomers.length})`);

  // 4. Gerar Vendas (substituindo o seed-sales.ts)
  const salesCountCheck = await prisma.sale.count();
  if (salesCountCheck === 0) {
    console.log('Nenhuma venda encontrada. Gerando 150 vendas com datas retroativas para os testes...');
    
    const dbProducts = await prisma.product.findMany();
    const dbCustomers = await prisma.customer.findMany();
    
    if (dbProducts.length > 0) {
      const paymentMethods = [PaymentMethod.MONEY, PaymentMethod.PIX, PaymentMethod.CREDIT, PaymentMethod.DEBIT, PaymentMethod.CREDIT_STORE];
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 90); // Últimos 90 dias

      for (let i = 0; i < 150; i++) {
        // Escolher de 1 a 3 produtos aleatórios para o pedido
        const numItems = Math.floor(Math.random() * 3) + 1;
        const items: { productId: number; quantity: number; price: number; costPrice: number }[] = [];
        let total = 0;
        let totalCost = 0;

        for (let j = 0; j < numItems; j++) {
          const product = dbProducts[Math.floor(Math.random() * dbProducts.length)];
          // Às vezes vende o fardo (multiplicador) ou unidades avulsas
          const isPack = Math.random() > 0.7; 
          const quantity = isPack ? (product.packQuantity || 1) : (Math.floor(Math.random() * 5) + 1);
          
          items.push({
            productId: product.id,
            quantity: quantity,
            price: product.price,
            costPrice: product.costPrice
          });
          
          total += product.price * quantity;
          totalCost += product.costPrice * quantity;
        }
        
        // Randomizar forma de pagamento e data
        const method = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
        const date = randomDate(startDate, endDate);
        
        // Se for fiado, obrigatoriamente associa a um cliente
        let customerId: number | undefined = undefined;
        if (method === PaymentMethod.CREDIT_STORE || Math.random() > 0.8) {
          const customer = dbCustomers[Math.floor(Math.random() * dbCustomers.length)];
          customerId = customer?.id;
        }

        await prisma.sale.create({
          data: {
            total,
            totalCost,
            paymentMethod: method,
            status: SaleStatus.COMPLETED,
            createdAt: date,
            customerId: customerId,
            items: {
              create: items
            }
          }
        });
      }
      console.log('150 vendas geradas com sucesso!');
    }
  } else {
    console.log(`O banco já possui ${salesCountCheck} vendas registradas. Pulando a geração automática de vendas.`);
  }

  console.log('✅ Seed finalizado com sucesso!');
}

main()
  .catch((e) => {
    console.error('Erro ao rodar o seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
