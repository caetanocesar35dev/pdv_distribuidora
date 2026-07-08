import { IsString, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty({ message: 'O nome do produto é obrigatório' })
  name: string;

  @IsNumber()
  @Min(0, { message: 'O preço não pode ser negativo' })
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'O estoque não pode ser negativo' })
  stock?: number;
}
