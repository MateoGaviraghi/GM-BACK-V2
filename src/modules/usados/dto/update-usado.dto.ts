import { PartialType } from '@nestjs/mapped-types';
import { CreateUsadoDto } from './create-usado.dto';

export class UpdateUsadoDto extends PartialType(CreateUsadoDto) {}
