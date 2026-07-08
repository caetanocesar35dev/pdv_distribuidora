import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentMethod, SaleStatus, CashStatus, MovementType } from '@prisma/client';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  async create(body: { paymentMethod: PaymentMethod; items: { productId: number; quantity: number }[] }) {
    if (!body.items || body.items.length === 0) {
      throw new BadRequestException('A venda deve conter pelo menos um item.');
    }

    // Executar a venda em uma transação de banco de dados
    return this.prisma.$transaction(async (tx) => {
      // 1. Verificar se o caixa está aberto
      const activeCash = await tx.cashRegister.findFirst({
        where: { status: CashStatus.OPEN },
      });
      if (!activeCash) {
        throw new BadRequestException('Não há caixa aberto. Abra o caixa antes de realizar vendas.');
      }

      let total = 0;
      const saleItemsData: { productId: number; quantity: number; price: number }[] = [];
      const stockUpdates: { productId: number; newStock: number }[] = [];

      // 2. Validar estoque e calcular o total com base no preço do cadastro (preço fixo)
      for (const item of body.items) {
        if (item.quantity <= 0) {
          throw new BadRequestException('A quantidade de cada produto deve ser maior que zero.');
        }

        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new NotFoundException(`Produto com ID ${item.productId} não encontrado.`);
        }

        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `Estoque insuficiente para o produto "${product.name}". Estoque atual: ${product.stock}, solicitado: ${item.quantity}.`
          );
        }

        const itemTotal = product.price * item.quantity;
        total += itemTotal;

        saleItemsData.push({
          productId: product.id,
          quantity: item.quantity,
          price: product.price,
        });

        stockUpdates.push({
          productId: product.id,
          newStock: product.stock - item.quantity,
        });
      }

      // 3. Atualizar estoques dos produtos
      for (const update of stockUpdates) {
        await tx.product.update({
          where: { id: update.productId },
          data: { stock: update.newStock },
        });
      }

      // 4. Criar a venda com seus itens
      const sale = await tx.sale.create({
        data: {
          total,
          paymentMethod: body.paymentMethod,
          status: SaleStatus.COMPLETED,
          items: {
            create: saleItemsData,
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      // 5. Registrar movimentação de entrada no caixa
      await tx.cashMovement.create({
        data: {
          cashRegisterId: activeCash.id,
          type: MovementType.SALE,
          amount: total,
          description: `Venda registrada #${sale.id}`,
        },
      });

      return sale;
    });
  }

  async findAll() {
    return this.prisma.sale.findMany({
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!sale) {
      throw new NotFoundException('Venda não encontrada.');
    }

    return sale;
  }

  async cancel(id: number) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Buscar a venda e seus itens
      const sale = await tx.sale.findUnique({
        where: { id },
        include: {
          items: true,
        },
      });

      if (!sale) {
        throw new NotFoundException('Venda não encontrada.');
      }

      if (sale.status === SaleStatus.CANCELED) {
        throw new BadRequestException('Esta venda já está cancelada.');
      }

      // 2. Verificar se há caixa aberto para registrar o estorno
      const activeCash = await tx.cashRegister.findFirst({
        where: { status: CashStatus.OPEN },
      });
      if (!activeCash) {
        throw new BadRequestException('Para cancelar uma venda, o caixa deve estar aberto para registrar o estorno.');
      }

      // 3. Devolver produtos ao estoque
      for (const item of sale.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (product) {
          await tx.product.update({
            where: { id: product.id },
            data: {
              stock: product.stock + item.quantity,
            },
          });
        }
      }

      // 4. Alterar status da venda para cancelada
      const updatedSale = await tx.sale.update({
        where: { id },
        data: {
          status: SaleStatus.CANCELED,
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      // 5. Registrar movimentação de saída (estorno) no caixa
      await tx.cashMovement.create({
        data: {
          cashRegisterId: activeCash.id,
          type: MovementType.OUT,
          amount: sale.total,
          description: `Cancelamento da Venda #${sale.id}`,
        },
      });

      return updatedSale;
    });
  }
}
