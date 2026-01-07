import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsArray, IsBoolean, IsString } from 'class-validator';
import { CreateUsadoDto } from './create-usado.dto';

export class UpdateUsadoDto extends PartialType(CreateUsadoDto) {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imagenesAEliminar?: string[]; // Array de public_ids de Cloudinary

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  videosAEliminar?: string[]; // Array de public_ids de Cloudinary

  @IsOptional()
  @IsBoolean()
  eliminarFotoSinFondo1?: boolean;

  @IsOptional()
  @IsBoolean()
  eliminarFotoSinFondo2?: boolean;
}
