import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.product.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
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

  async create(data: { code: string; name: string; price: number; stock?: number }) {
    const existing = await this.prisma.product.findUnique({
      where: { code: data.code },
    });
    if (existing) {
      throw new ConflictException('Já existe um produto cadastrado com este código');
    }

    return this.prisma.product.create({
      data: {
        code: data.code,
        name: data.name,
        price: Number(data.price),
        stock: data.stock !== undefined ? Number(data.stock) : 0,
      },
    });
  }

  async update(id: number, data: { code?: string; name?: string; price?: number; stock?: number }) {
    await this.findOne(id);

    if (data.code) {
      const existing = await this.prisma.product.findUnique({
        where: { code: data.code },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('Já existe outro produto cadastrado com este código');
      }
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        ...data,
        price: data.price !== undefined ? Number(data.price) : undefined,
        stock: data.stock !== undefined ? Number(data.stock) : undefined,
      },
    });
  }

  async addStock(id: number, quantity: number) {
    if (quantity <= 0) {
      throw new BadRequestException('A quantidade de entrada deve ser maior que zero');
    }

    const product = await this.findOne(id);
    return this.prisma.product.update({
      where: { id },
      data: {
        stock: product.stock + Math.floor(quantity),
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
