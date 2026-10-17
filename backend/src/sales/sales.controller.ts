import { Controller, Get, Post, Param, Body, UseGuards, Query, Request, BadRequestException } from '@nestjs/common';
import { SalesService } from './sales.service';
import { AuthGuard } from '../auth/auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { PaymentMethod } from '@prisma/client';

@UseGuards(AuthGuard)
@Controller('sales')
export class SalesController {
  constructor(private salesService: SalesService) {}

  @Post()
  async create(@Body() body: { paymentMethod: PaymentMethod; customerId?: number; discount?: number; items: { productId: number; quantity: number }[]; bottleMovements?: { bottleTypeId: number; quantity: number; type: 'CUSTOMER_BORROW' | 'CUSTOMER_RETURN' }[] }, @Request() req: any) {
    return this.salesService.create(body, req.user.sub);
  }

  // Lançamento de vendas antigas (do caderno): somente administradores.
  // Não mexe em estoque, caixa nem vasilhames; se for fiado, soma na dívida do cliente.
  @UseGuards(AdminGuard)
  @Post('retroactive')
  async createRetroactive(@Body() body: { createdAt: string; paymentMethod: PaymentMethod; customerId?: number; discount?: number; items: { productId: number; quantity: number }[] }, @Request() req: any) {
    const date = new Date(body.createdAt);
    if (!body.createdAt || isNaN(date.getTime())) {
      throw new BadRequestException('Informe uma data válida para a venda.');
    }
    if (date.getTime() > Date.now() + 60_000) {
      throw new BadRequestException('A data da venda antiga não pode estar no futuro.');
    }
    if (!Object.values(PaymentMethod).includes(body.paymentMethod)) {
      throw new BadRequestException('Forma de pagamento inválida.');
    }

    // Repassa só os campos permitidos (sem skipStockUpdate, commandTabId, vasilhames etc.)
    return this.salesService.create(
      {
        paymentMethod: body.paymentMethod,
        customerId: body.customerId ? Number(body.customerId) : undefined,
        discount: body.discount,
        items: (body.items || []).map(i => ({ productId: Number(i.productId), quantity: Number(i.quantity) })),
      },
      req.user.sub,
      { retroactiveDate: date },
    );
  }

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('paymentMethod') paymentMethod?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.salesService.findAll({ page, limit, search, paymentMethod, startDate, endDate });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.salesService.findOne(Number(id));
  }

  @Post(':id/cancel')
  async cancel(@Param('id') id: string) {
    return this.salesService.cancel(Number(id));
  }
}
