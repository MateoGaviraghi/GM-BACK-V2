import { IsIn, IsNotEmpty } from 'class-validator';

export class ChangeStatusVehiculos0kmDto {
  @IsNotEmpty()
  @IsIn(['Disponible', 'Reservado', 'Vendido'])
  estado!: 'Disponible' | 'Reservado' | 'Vendido';
}
