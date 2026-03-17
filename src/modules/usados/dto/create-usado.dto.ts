import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsIn,
  MinLength,
  Min,
  IsArray,
} from 'class-validator';
import { Transform } from 'class-transformer';

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
  @IsString()
  version?: string;

  @IsOptional()
  @IsString()
  tipoVehiculo?: string;

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
  transmision?: string;

  @IsOptional()
  @IsString()
  tracciones?: string;

  @IsOptional()
  @IsString()
  traccion?: string;

  @IsOptional()
  @IsString()
  potenciaMaxima?: string;

  @IsOptional()
  @IsString()
  potencia?: string;

  @IsOptional()
  @IsString()
  cilindrada?: string;

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
  @IsString()
  color?: string;

  @IsOptional()
  @IsNumber()
  cantidadPuertas?: number;

  @IsOptional()
  @IsNumber()
  cantidadAsientos?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return [];
      }
    }
    return value;
  })
  equipamiento?: string[];

  @IsOptional()
  @IsIn(['Disponible', 'Reservado', 'Vendido'])
  estado?: 'Disponible' | 'Reservado' | 'Vendido';

  @IsOptional()
  @IsString()
  descripcion?: string;
}
