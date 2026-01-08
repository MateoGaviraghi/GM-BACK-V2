import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsArray, IsBoolean, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { CreateUsadoDto } from './create-usado.dto';

export class UpdateUsadoDto extends PartialType(CreateUsadoDto) {
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
  imagenesAEliminar?: string[]; // Array de public_ids de Cloudinary

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
  videosAEliminar?: string[]; // Array de public_ids de Cloudinary

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value === 'true';
    }
    return value;
  })
  eliminarFotoSinFondo1?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value === 'true';
    }
    return value;
  })
  eliminarFotoSinFondo2?: boolean;
}
