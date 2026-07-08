import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { SalesService } from './sales.service';
import { AuthGuard } from '../auth/auth.guard';
import { PaymentMethod } from '@prisma/client';

@UseGuards(AuthGuard)
@Controller('sales')
export class SalesController {
  constructor(private salesService: SalesService) {}

  @Post()
  async create(@Body() body: { paymentMethod: PaymentMethod; items: { productId: number; quantity: number }[] }) {
    return this.salesService.create(body);
  }

  @Get()
  async findAll() {
    return this.salesService.findAll();
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
