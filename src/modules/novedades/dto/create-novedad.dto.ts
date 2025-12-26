import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDate,
  IsNotEmpty,
  MaxLength,
  IsArray,
  ValidateNested,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';

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

export class CreateNovedadDto {
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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LinkDto)
  @IsOptional()
  links?: LinkDto[];
}
