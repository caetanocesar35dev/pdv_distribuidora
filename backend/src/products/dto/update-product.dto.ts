import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'O preço não pode ser negativo' })
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'O preço de custo não pode ser negativo' })
  costPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'O estoque não pode ser negativo' })
  stock?: number;
}
