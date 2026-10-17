import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) { }

  private generateBarcode(): string {
    let code = '';
    for (let i = 0; i < 13; i++) {
      code += Math.floor(Math.random() * 10).toString();
    }
    return code;
  }

  async findAll() {
    return this.prisma.product.findMany({
      orderBy: { name: 'asc' },
      include: { bottleType: true }
    });
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { bottleType: true, customerPrices: true }
    });
    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }
    return product;
  }

  async findByCode(code: string) {
    const product = await this.prisma.product.findUnique({
      where: { code },
    });
    if (!product) {
      throw new NotFoundException(`Produto com o código ${code} não encontrado`);
    }
    return product;
  }

  async create(data: CreateProductDto & { modifierId?: number, modifiedEndpoint?: string }) {
    let code = '';
    let isUnique = false;

    while (!isUnique) {
      code = this.generateBarcode();
      const existing = await this.prisma.product.findUnique({ where: { code } });
      if (!existing) {
        isUnique = true;
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          code,
          name: data.name,
          price: Number(data.price),
          costPrice: Number(data.costPrice),
          stock: data.stock !== undefined ? Number(data.stock) : 0,
          packQuantity: data.packQuantity !== undefined ? Number(data.packQuantity) : 1,
          bottleTypeId: data.bottleTypeId ? Number(data.bottleTypeId) : null,
          modifierId: data.modifierId,
          modifiedEndpoint: data.modifiedEndpoint,
        },
      });
      await this.syncCustomerPrices(tx, product.id, data.customerPrices);
      return product;
    });
  }

  async update(id: number, data: UpdateProductDto & { modifierId?: number, modifiedEndpoint?: string }) {
    await this.findOne(id);
    const { customerPrices, ...productData } = data;

    // Ajuste manual de estoque (correção de contagem): precisa ser inteiro e não negativo
    if (data.stock !== undefined && (!Number.isInteger(Number(data.stock)) || Number(data.stock) < 0)) {
      throw new BadRequestException('A quantidade em estoque deve ser um número inteiro maior ou igual a zero');
    }

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.update({
        where: { id },
        data: {
          ...productData,
          price: data.price !== undefined ? Number(data.price) : undefined,
          costPrice: data.costPrice !== undefined ? Number(data.costPrice) : undefined,
          stock: data.stock !== undefined ? Number(data.stock) : undefined,
          packQuantity: data.packQuantity !== undefined ? Number(data.packQuantity) : undefined,
          bottleTypeId: data.bottleTypeId !== undefined ? (data.bottleTypeId ? Number(data.bottleTypeId) : null) : undefined,
          modifierId: data.modifierId,
          modifiedEndpoint: data.modifiedEndpoint,
        },
      });
      await this.syncCustomerPrices(tx, id, customerPrices);
      return product;
    });
  }

  // Substitui os preços especiais por cliente do produto pela lista recebida.
  // Se a lista não for enviada (undefined), os preços existentes são mantidos.
  private async syncCustomerPrices(
    tx: Prisma.TransactionClient,
    productId: number,
    customerPrices?: { customerId: number; price: number }[],
  ) {
    if (customerPrices === undefined || customerPrices === null) return;
    if (!Array.isArray(customerPrices)) {
      throw new BadRequestException('Formato inválido para os preços por cliente');
    }

    const data = customerPrices
      .filter(cp => cp && cp.price !== null && cp.price !== undefined && String(cp.price) !== '')
      .map(cp => ({ productId, customerId: Number(cp.customerId), price: Number(cp.price) }));

    for (const cp of data) {
      if (!Number.isInteger(cp.customerId) || isNaN(cp.price) || cp.price <= 0) {
        throw new BadRequestException('Os preços especiais por cliente devem ser maiores que zero');
      }
    }

    await tx.customerProductPrice.deleteMany({ where: { productId } });
    if (data.length > 0) {
      await tx.customerProductPrice.createMany({ data });
    }
  }

  async addStock(id: number, quantity: number, modifierId?: number, modifiedEndpoint?: string) {
    if (quantity <= 0) {
      throw new BadRequestException('A quantidade de entrada deve ser maior que zero');
    }

    const product = await this.findOne(id);
    return this.prisma.product.update({
      where: { id },
      data: {
        stock: product.stock + Math.floor(quantity),
        modifierId,
        modifiedEndpoint,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    try {
      return await this.prisma.product.delete({
        where: { id },
      });
    } catch (e) {
      throw new ConflictException('Não é possível excluir um produto que possui histórico de vendas');
    }
  }
}
