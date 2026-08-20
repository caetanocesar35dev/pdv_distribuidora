import { Controller, Get, Post, Param, Body, UseGuards, Query } from '@nestjs/common';
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
