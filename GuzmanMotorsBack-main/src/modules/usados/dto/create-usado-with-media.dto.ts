import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsIn,
  MinLength,
  IsNotEmpty,
} from 'class-validator';

export class CreateUsadoWithMediaDto {
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

  @IsNotEmpty({ message: 'La marca es obligatoria' })
  @IsString()
  marca!: string;

  @IsNotEmpty({ message: 'El modelo es obligatorio' })
  @IsString()
  modelo!: string;

  @IsOptional()
  @IsNumber()
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
