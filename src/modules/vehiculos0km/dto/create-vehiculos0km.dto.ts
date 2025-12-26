import {
  IsArray,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateVehiculos0kmDto {
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

  @IsOptional()
  @IsString()
  marca?: string;

  @IsOptional()
  @IsString()
  modelo?: string;

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
  anio?: string; // ISO date string

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

  @IsOptional()
  @IsArray()
  imagenes?: any[]; // MediaFile[] - Lo validaremos en el servicio

  @IsOptional()
  @IsArray()
  videos?: any[]; // MediaFile[] - Lo validaremos en el servicio
}
