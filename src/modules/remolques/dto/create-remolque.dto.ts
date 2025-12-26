import {
  IsArray,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// DTOs para subdocumentos
export class ChasisDto {
  @IsOptional()
  @IsString()
  tipo?: string;

  @IsOptional()
  @IsString()
  material?: string;

  @IsOptional()
  @IsString()
  pisoChapaEspesor?: string;

  @IsOptional()
  @IsString()
  ejesTubularesDiametro?: string;

  @IsOptional()
  @IsString()
  paragolpe?: string;

  @IsOptional()
  @IsString()
  engancheEmergencia?: string;

  @IsOptional()
  @IsString()
  otros?: string;
}

export class DimensionesDto {
  @IsOptional()
  @IsNumber()
  largoInterior?: number;

  @IsOptional()
  @IsNumber()
  anchoExterior?: number;

  @IsOptional()
  @IsNumber()
  alturaBaranda?: number;

  @IsOptional()
  @IsNumber()
  alturaFrente?: number;

  @IsOptional()
  @IsNumber()
  alturaContrafrente?: number;

  @IsOptional()
  @IsNumber()
  alturaPisoAlPiso?: number;
}

export class EjesSuspensionDto {
  @IsOptional()
  @IsString()
  tipoEjes?: string;

  @IsOptional()
  @IsString()
  llantas?: string;

  @IsOptional()
  @IsString()
  suspension?: string;

  @IsOptional()
  @IsString()
  frenos?: string;
}

export class CarroceriaDto {
  @IsOptional()
  @IsString()
  tipo?: string;

  @IsOptional()
  @IsString()
  material?: string;

  @IsOptional()
  @IsString()
  pintura?: string;

  @IsOptional()
  @IsString()
  tratamiento?: string;
}

export class CreateRemolqueDto {
  // ===== CAMPOS OBLIGATORIOS =====
  @IsNotEmpty({ message: 'El título es obligatorio' })
  @IsString()
  @MinLength(1)
  titulo!: string;

  @IsNotEmpty({ message: 'La condición es obligatoria' })
  @IsIn(['0KM', 'USADO'])
  condicion!: '0KM' | 'USADO';

  // ===== CAMPOS OPCIONALES =====
  @IsOptional()
  @IsIn(['ACOPLADO', 'SEMIREMOLQUE', 'BITREN', 'CARROCERIA'])
  categoria?: 'ACOPLADO' | 'SEMIREMOLQUE' | 'BITREN' | 'CARROCERIA';

  @IsOptional()
  @IsString()
  marca?: string;

  @IsOptional()
  @IsString()
  modelo?: string;

  // ===== CAMPOS OPCIONALES =====
  @IsOptional()
  @IsDateString()
  anio?: string;

  @IsOptional()
  @IsString()
  tipoCarroceria?: string;

  @IsOptional()
  @IsNumber()
  cantidadEjes?: number;

  @IsOptional()
  @IsString()
  capacidadCarga?: string;

  @IsOptional()
  @IsNumber()
  tara?: number;

  @IsOptional()
  @IsString()
  pbtc?: string;

  @IsOptional()
  @IsNumber()
  kilometraje?: number;

  @IsOptional()
  @IsIn(['Disponible', 'Reservado', 'Vendido'])
  estado?: 'Disponible' | 'Reservado' | 'Vendido';

  // ===== ESPECIFICACIONES TÉCNICAS =====
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ChasisDto)
  chasis?: ChasisDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => DimensionesDto)
  dimensiones?: DimensionesDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => EjesSuspensionDto)
  ejesSuspension?: EjesSuspensionDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CarroceriaDto)
  carroceria?: CarroceriaDto;

  // ===== EQUIPAMIENTO =====
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  equipamientoSerie?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  equipamientoOpcional?: string[];

  // ===== OTROS =====
  @IsOptional()
  @IsString()
  garantia?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsArray()
  imagenes?: any[]; // MediaFile[] - Lo validaremos en el servicio

  // ===== FOTOS SIN FONDO PARA PDF =====
  @IsOptional()
  fotoSinFondo1?: any; // MediaFile - Se sube con multer

  @IsOptional()
  fotoSinFondo2?: any; // MediaFile - Se sube con multer

  @IsOptional()
  @IsArray()
  videos?: any[]; // MediaFile[] - Lo validaremos en el servicio
}
