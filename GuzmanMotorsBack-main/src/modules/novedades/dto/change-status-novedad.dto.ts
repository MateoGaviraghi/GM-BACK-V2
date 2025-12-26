import { IsIn } from 'class-validator';

export class ChangeStatusNovedadDto {
  @IsIn(['Borrador', 'Publicado', 'Archivado'])
  estado!: 'Borrador' | 'Publicado' | 'Archivado';
}
