import {
  Controller,
  Get,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NovedadesService } from './novedades.service';
import type { Novedad } from './entities/novedad.entity';

@Controller('novedades/public')
export class NovedadesPublicController {
  constructor(private readonly novedadesService: NovedadesService) {}

  @Get()
  findAllPublic(@Query() query: Record<string, string>) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const sortBy =
      (query.sortBy as keyof Novedad | 'createdAt' | 'updatedAt') ??
      'createdAt';
    const sortOrder = (query.sortOrder as 'asc' | 'desc') ?? 'desc';

    const filters = {
      categoria: query.categoria,
      destacada: query.destacada === 'true' ? true : undefined,
    };

    // Público siempre excluye novedades eliminadas
    return this.novedadesService.findAll({
      page,
      limit,
      sortBy,
      sortOrder,
      includeDeleted: false,
      filters,
    });
  }

  @Get('search')
  searchPublic(@Query() query: Record<string, string>) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const sortBy =
      (query.sortBy as keyof Novedad | 'createdAt' | 'updatedAt') ??
      'createdAt';
    const sortOrder = (query.sortOrder as 'asc' | 'desc') ?? 'desc';
    const q = query.q;

    const filters = {
      categoria: query.categoria,
      destacada: query.destacada === 'true' ? true : undefined,
    };

    // Público siempre excluye novedades eliminadas
    return this.novedadesService.search({
      q,
      page,
      limit,
      sortBy,
      sortOrder,
      includeDeleted: false,
      filters,
    });
  }

  @Get('options')
  @HttpCode(HttpStatus.OK)
  getNovedadOptionsPublic() {
    return this.novedadesService.getNovedadOptions();
  }

  @Get('suggestions')
  @HttpCode(HttpStatus.OK)
  suggestionsPublic(
    @Query('field') field: string,
    @Query('query') text: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.novedadesService.suggestions(field, text || '', limitNum);
  }

  @Get('featured')
  @HttpCode(HttpStatus.OK)
  getFeaturedPublic(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 5;
    return this.novedadesService.getFeatured(limitNum);
  }

  @Get('recent')
  @HttpCode(HttpStatus.OK)
  getRecentPublic(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.novedadesService.getRecent(limitNum);
  }

  @Get('categoria/:categoria')
  @HttpCode(HttpStatus.OK)
  getByCategoriaPublic(
    @Param('categoria') categoria: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.novedadesService.getByCategoria(categoria, pageNum, limitNum);
  }

  @Get(':id')
  findOnePublic(@Param('id') id: string) {
    return this.novedadesService.findOne(id);
  }
}
