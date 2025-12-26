import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { NovedadesService } from './novedades.service';
import { CreateNovedadDto } from './dto/create-novedad.dto';
import { CreateNovedadWithMediaDto } from './dto/create-novedad-with-media.dto';
import { UpdateNovedadDto } from './dto/update-novedad.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ParseJsonFieldsInterceptor } from '../../common/interceptors/parse-json-fields.interceptor';
import type { Novedad } from './entities/novedad.entity';

@Controller('novedades')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class NovedadesController {
  constructor(private readonly novedadesService: NovedadesService) {}

  @Post()
  create(@Body() createNovedadDto: CreateNovedadDto) {
    return this.novedadesService.create(createNovedadDto);
  }

  @Post('create-with-media')
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'imagenes', maxCount: 10 }]),
    new ParseJsonFieldsInterceptor(['links']),
  )
  async createWithMedia(
    @Body() createNovedadDto: CreateNovedadWithMediaDto,
    @UploadedFiles()
    files: {
      imagenes?: Express.Multer.File[];
    },
  ) {
    try {
      // Validar que al menos se proporcione el título y contenido
      if (!createNovedadDto.titulo || !createNovedadDto.contenido) {
        throw new BadRequestException(
          'Título y contenido son campos obligatorios para crear una novedad',
        );
      }

      const result = await this.novedadesService.createWithMedia(
        createNovedadDto,
        files.imagenes || [],
      );

      return {
        success: true,
        message: 'Novedad creada exitosamente con archivos multimedia',
        data: result,
      };
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      const message = error.message || 'Error al crear la novedad';
      throw new BadRequestException({
        success: false,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        message,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        error: error,
      });
    }
  }

  @Get()
  findAll(@Query() query: Record<string, string>) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const sortBy =
      (query.sortBy as keyof Novedad | 'createdAt' | 'updatedAt') ??
      'fechaPublicacion';
    const sortOrder = (query.sortOrder as 'asc' | 'desc') ?? 'desc';
    const includeDeleted = query.includeDeleted === 'true';

    const filters = {
      categoria: query.categoria,
      destacada: query.destacada === 'true' ? true : undefined,
    };

    return this.novedadesService.findAll({
      page,
      limit,
      sortBy,
      sortOrder,
      includeDeleted,
      filters,
    });
  }

  @Get('search')
  search(@Query() query: Record<string, string>) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const sortBy =
      (query.sortBy as keyof Novedad | 'createdAt' | 'updatedAt') ??
      'fechaPublicacion';
    const sortOrder = (query.sortOrder as 'asc' | 'desc') ?? 'desc';
    const includeDeleted = query.includeDeleted === 'true';

    const filters = {
      categoria: query.categoria,
      destacada: query.destacada === 'true' ? true : undefined,
    };

    return this.novedadesService.search({
      q: query.q,
      page,
      limit,
      sortBy,
      sortOrder,
      includeDeleted,
      filters,
    });
  }

  @Get('options')
  @HttpCode(HttpStatus.OK)
  getOptions() {
    return this.novedadesService.getNovedadOptions();
  }

  @Get('suggestions/:field')
  @HttpCode(HttpStatus.OK)
  suggestions(
    @Param('field') field: string,
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.novedadesService.suggestions(field, query, limitNum);
  }

  @Get('featured')
  @HttpCode(HttpStatus.OK)
  getFeatured(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 5;
    return this.novedadesService.getFeatured(limitNum);
  }

  @Get('recent')
  @HttpCode(HttpStatus.OK)
  getRecent(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.novedadesService.getRecent(limitNum);
  }

  @Get('categoria/:categoria')
  @HttpCode(HttpStatus.OK)
  getByCategoria(
    @Param('categoria') categoria: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.novedadesService.getByCategoria(categoria, pageNum, limitNum);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.novedadesService.findOne(id);
  }

  @Patch(':id')
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'imagenes', maxCount: 10 }]),
    new ParseJsonFieldsInterceptor(['links']),
  )
  update(
    @Param('id') id: string,
    @Body() updateNovedadDto: UpdateNovedadDto,
    @UploadedFiles()
    files?: {
      imagenes?: Express.Multer.File[];
    },
  ) {
    return this.novedadesService.update(id, updateNovedadDto, files?.imagenes);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.novedadesService.remove(id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  restore(@Param('id') id: string) {
    return this.novedadesService.restore(id);
  }

  @Delete(':id/hard')
  @HttpCode(HttpStatus.OK)
  hardDelete(@Param('id') id: string) {
    return this.novedadesService.hardDelete(id);
  }

  @Delete(':id/images/:publicId')
  @HttpCode(HttpStatus.OK)
  deleteImage(@Param('id') id: string, @Param('publicId') publicId: string) {
    return this.novedadesService.deleteImage(id, publicId);
  }
}
