import { PartialType } from '@nestjs/mapped-types';
import { CreateNovedadDto } from './create-novedad.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNovedadDto extends PartialType(CreateNovedadDto) {
  @IsBoolean()
  @IsOptional()
  deleted?: boolean;
}
