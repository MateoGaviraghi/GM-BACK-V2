import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsIn,
  MinLength,
} from 'class-validator';

export class CreateRemolqueWithMediaDto {
  // ===== CAMPOS PRINCIPALES (Obligatorios) =====
  @IsString()
  @MinLength(1, { message: 'El título es obligatorio' })
  titulo!: string;

  @IsIn(['0KM', 'USADO'], { message: 'La condición debe ser 0KM o USADO' })
  condicion!: '0KM' | 'USADO';

  @IsIn(['ACOPLADO', 'SEMIREMOLQUE', 'BITREN', 'CARROCERIA'], {
    message:
      'La categoría debe ser ACOPLADO, SEMIREMOLQUE, BITREN o CARROCERIA',
  })
  categoria!: 'ACOPLADO' | 'SEMIREMOLQUE' | 'BITREN' | 'CARROCERIA';

  @IsString({ message: 'La marca es obligatoria' })
  marca!: string;

  @IsString({ message: 'El modelo es obligatorio' })
  modelo!: string;

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
  // Nota: Estos campos vienen como strings JSON desde form-data
  // El ParseJsonFieldsInterceptor los convertirá a objetos antes de la validación
  @IsOptional()
  chasis?: any;

  @IsOptional()
  dimensiones?: any;

  @IsOptional()
  ejesSuspension?: any;

  @IsOptional()
  carroceria?: any;

  // ===== EQUIPAMIENTO =====
  @IsOptional()
  equipamientoSerie?: any;

  @IsOptional()
  equipamientoOpcional?: any;

  // ===== OTROS =====
  @IsOptional()
  @IsString()
  garantia?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;
}
