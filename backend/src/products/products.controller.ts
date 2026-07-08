import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { AuthGuard } from '../auth/auth.guard';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  async findAll() {
    return this.productsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.productsService.findOne(Number(id));
  }

  @Get('code/:code')
  async findByCode(@Param('code') code: string) {
    return this.productsService.findByCode(code);
  }

  @UseGuards(AuthGuard)
  @Post()
  async create(@Body() body: CreateProductDto) {
    return this.productsService.create(body);
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateProductDto
  ) {
    return this.productsService.update(Number(id), body);
  }

  @UseGuards(AuthGuard)
  @Post(':id/entry')
  async addStock(@Param('id') id: string, @Body() body: { quantity: number }) {
    return this.productsService.addStock(Number(id), body.quantity);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.productsService.remove(Number(id));
  }
}
