import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsIn,
  MinLength,
  Min,
} from 'class-validator';

export class CreateUsadoDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  titulo?: string;

  @IsOptional()
  @IsString()
  tipos?: string;

  @IsOptional()
  @IsString()
  variantes?: string;

  @IsString()
  @MinLength(1, { message: 'La marca es obligatoria' })
  marca!: string;

  @IsString()
  @MinLength(1, { message: 'El modelo es obligatorio' })
  modelo!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  kilometraje?: number;

  @IsOptional()
  @IsString()
  tipoCombustible?: string;

  @IsOptional()
  @IsString()
  motor?: string;

  @IsOptional()
  @IsDateString()
  anio?: string;

  @IsOptional()
  @IsString()
  transmisiones?: string;

  @IsOptional()
  @IsString()
  tracciones?: string;

  @IsOptional()
  @IsString()
  potenciaMaxima?: string;

  @IsOptional()
  @IsString()
  capacidadCarga?: string;

  @IsOptional()
  @IsString()
  sistemaFrenado?: string;

  @IsOptional()
  @IsString()
  ejes?: string;

  @IsOptional()
  @IsIn(['Disponible', 'Reservado', 'Vendido'])
  estado?: 'Disponible' | 'Reservado' | 'Vendido';

  @IsOptional()
  @IsString()
  descripcion?: string;
}
