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
import { RemolquesService } from './remolques.service';
import { CreateRemolqueDto } from './dto/create-remolque.dto';
import { CreateRemolqueWithMediaDto } from './dto/create-remolque-with-media.dto';
import { UpdateRemolqueDto } from './dto/update-remolque.dto';
import { ChangeStatusRemolqueDto } from './dto/change-status-remolque.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ParseJsonFieldsInterceptor } from '../../common/interceptors/parse-json-fields.interceptor';
import type { Remolque, RemolqueDocument } from './entities/remolque.entity';

@Controller('remolques')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class RemolquesController {
  constructor(private readonly remolquesService: RemolquesService) {}

  @Post()
  create(@Body() createRemolqueDto: CreateRemolqueDto) {
    return this.remolquesService.create(createRemolqueDto);
  }

  @Post('create-with-media')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'imagenes', maxCount: 10 },
      { name: 'videos', maxCount: 5 },
      { name: 'fotoSinFondo1', maxCount: 1 },
      { name: 'fotoSinFondo2', maxCount: 1 },
    ]),
    new ParseJsonFieldsInterceptor([
      'chasis',
      'dimensiones',
      'ejesSuspension',
      'carroceria',
      'equipamientoSerie',
      'equipamientoOpcional',
    ]),
  )
  async createWithMedia(
    @Body() createRemolqueDto: CreateRemolqueWithMediaDto,
    @UploadedFiles()
    files: {
      imagenes?: Express.Multer.File[];
      videos?: Express.Multer.File[];
      fotoSinFondo1?: Express.Multer.File[];
      fotoSinFondo2?: Express.Multer.File[];
    },
  ) {
    try {
      // Validación ya se hace en el DTO (titulo y condicion son obligatorios)
      const result = await this.remolquesService.createWithMedia(
        createRemolqueDto,
        files.imagenes || [],
        files.videos || [],
        files.fotoSinFondo1?.[0],
        files.fotoSinFondo2?.[0],
      );

      return {
        success: true,
        message: 'Remolque creado exitosamente con archivos multimedia',
        data: result,
      };
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      const message = error.message || 'Error al crear el remolque';
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
      (query.sortBy as keyof Remolque | 'createdAt' | 'updatedAt') ??
      'createdAt';
    const sortOrder = (query.sortOrder as 'asc' | 'desc') ?? 'desc';

    const filters = {
      marca: query.marca,
      modelo: query.modelo,
      estado: query.estado,
      condicion: query.condicion,
      categoria: query.categoria,
      tipoCarroceria: query.tipoCarroceria,
      cantidadEjes: query.cantidadEjes ? Number(query.cantidadEjes) : undefined,
    };

    const ranges = {
      kilometrajeMin: query.kilometrajeMin
        ? Number(query.kilometrajeMin)
        : undefined,
      kilometrajeMax: query.kilometrajeMax
        ? Number(query.kilometrajeMax)
        : undefined,
      anioFrom: query.anioFrom,
      anioTo: query.anioTo,
      taraMin: query.taraMin ? Number(query.taraMin) : undefined,
      taraMax: query.taraMax ? Number(query.taraMax) : undefined,
    };

    return this.remolquesService.findAll({
      page,
      limit,
      sortBy,
      sortOrder,
      filters,
      ranges,
    });
  }

  @Post('search')
  search(
    @Body()
    body: {
      q?: string;
      page?: number;
      limit?: number;
      sortBy?: keyof Remolque | 'createdAt' | 'updatedAt';
      sortOrder?: 'asc' | 'desc';
      filters?: {
        marca?: string;
        modelo?: string;
        estado?: string;
        condicion?: string;
        categoria?: string;
        tipoCarroceria?: string;
        cantidadEjes?: number;
      };
      ranges?: {
        kilometrajeMin?: number;
        kilometrajeMax?: number;
        anioFrom?: string;
        anioTo?: string;
        taraMin?: number;
        taraMax?: number;
      };
    },
  ) {
    const {
      q,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      filters = {},
      ranges = {},
    } = body;

    return this.remolquesService.search({
      q,
      page,
      limit,
      sortBy,
      sortOrder,
      filters,
      ranges,
    });
  }

  @Get('options')
  @HttpCode(HttpStatus.OK)
  getRemolqueOptions() {
    return this.remolquesService.getRemolqueOptions();
  }

  @Get('suggestions')
  suggestions(
    @Query('field') field: string,
    @Query('query') text: string,
    @Query('limit') limit?: string,
  ) {
    return this.remolquesService.suggestions(
      field,
      text ?? '',
      limit ? Number(limit) : 10,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.remolquesService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateRemolqueDto: UpdateRemolqueDto,
  ): Promise<{ message: string; remolque: RemolqueDocument }> {
    const remolque = await this.remolquesService.update(id, updateRemolqueDto);

    return {
      message: 'Remolque actualizado correctamente',
      remolque,
    };
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  changeStatus(
    @Param('id') id: string,
    @Body() changeStatusDto: ChangeStatusRemolqueDto,
  ) {
    return this.remolquesService.changeStatus(id, changeStatusDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.remolquesService.remove(id);
  }
}
