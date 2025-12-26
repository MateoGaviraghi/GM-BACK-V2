import { IsIn, IsNotEmpty } from 'class-validator';

export class ChangeStatusRemolqueDto {
  @IsNotEmpty()
  @IsIn(['Disponible', 'Reservado', 'Vendido'])
  estado!: 'Disponible' | 'Reservado' | 'Vendido';
}
