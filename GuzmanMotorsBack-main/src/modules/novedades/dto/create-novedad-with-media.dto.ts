import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDate,
  IsNotEmpty,
  MaxLength,
  ValidateNested,
  IsArray,
  IsUrl,
} from 'class-validator';

class MediaFileDto {
  @IsString()
  url: string;

  @IsString()
  publicId: string;

  @IsString()
  tipo: 'imagen' | 'video';

  @IsOptional()
  thumbnails?: {
    small?: string;
    medium?: string;
    large?: string;
  };
}

class LinkDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  titulo: string;

  @IsUrl()
  @IsNotEmpty()
  url: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  descripcion?: string;
}

export class CreateNovedadWithMediaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  titulo: string;

  @IsString()
  @IsNotEmpty()
  contenido: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  resumen?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  categoria?: string;

  @IsBoolean()
  @IsOptional()
  destacada?: boolean;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  fechaPublicacion?: Date;

  @ValidateNested({ each: true })
  @Type(() => MediaFileDto)
  @IsOptional()
  imagenes?: MediaFileDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LinkDto)
  @IsOptional()
  links?: LinkDto[];
}
