import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateClienteDto {
  @IsOptional()
  @IsString()
  nombreCompleto?: string;

  @IsOptional()
  @IsDateString()
  fechaNacimiento?: string; // ISO date string

  @IsOptional()
  @IsString()
  provincia?: string;

  @IsOptional()
  @IsString()
  localidad?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsString()
  telefonoCelular?: string;

  @IsOptional()
  @IsString()
  telefonoFijo?: string;

  @IsOptional()
  @IsString()
  correoElectronico?: string;

  @IsOptional()
  @IsString()
  tipoVehiculo?: string;

  @IsOptional()
  @IsString()
  productoServicio?: string;

  @IsOptional()
  @IsString()
  marca?: string;

  @IsOptional()
  @IsString()
  modelo?: string;

  @IsOptional()
  @IsNumber()
  anioCompra?: number;

  @IsOptional()
  @IsString()
  @IsIn(['Comprador', 'Vendedor', 'Consultor'])
  tipoCliente?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
