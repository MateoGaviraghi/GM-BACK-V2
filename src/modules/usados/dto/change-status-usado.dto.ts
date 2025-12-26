import { IsIn } from 'class-validator';

export class ChangeStatusUsadoDto {
  @IsIn(['Disponible', 'Reservado', 'Vendido'])
  estado!: 'Disponible' | 'Reservado' | 'Vendido';
}
