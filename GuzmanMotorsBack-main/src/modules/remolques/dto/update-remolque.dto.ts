import { PartialType } from '@nestjs/mapped-types';
import { CreateRemolqueDto } from './create-remolque.dto';

export class UpdateRemolqueDto extends PartialType(CreateRemolqueDto) {}
